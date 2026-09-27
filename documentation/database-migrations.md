# Database Migrations

Schema changes are managed with [Alembic](https://alembic.sqlalchemy.org/). Every change to a SQLAlchemy model needs a matching migration — the schema is never built from the models directly.

Migrations live in [`backend/app/db/migrations/versions/`](../backend/app/db/migrations/versions/), and the Alembic config is at [`app/db/migrations/alembic.ini`](../backend/app/db/migrations/alembic.ini) rather than the project root, so every command needs `-c` pointing at it.

## The design

[`env.py`](../backend/app/db/migrations/env.py) does two things worth knowing about:

- It sets the database URL from application settings (`config.set_main_option('sqlalchemy.url', settings.sync_driver_database_url)`), so Alembic connects wherever `backend/.env` points. There's no connection string in `alembic.ini`.
- `target_metadata = Base.metadata`, imported from [`app/db/base.py`](../backend/app/db/base.py). That's what autogenerate compares the live database against.

**A new model must be imported in `base.py` or autogenerate won't see it.** The model file alone isn't enough — nothing imports it, so its table never reaches `Base.metadata`, and Alembic will cheerfully generate an empty migration.

Migrations are applied automatically on container start by [`run.sh`](../backend/run.sh), which runs `alembic upgrade head` before uvicorn. So in normal development you never run the upgrade by hand — you only generate migrations.

## Creating a migration

### 1. Point your `.env` at the local database

Autogenerate works by connecting to a real database and diffing it against the models, so the database has to be reachable **from your shell**, not from inside a container.

In `backend/.env`:

```
DATABASE_HOST=localhost
```

not `db`. `db` is the service name on the Docker network — it resolves inside the Compose stack, but means nothing on your machine, and Alembic will hang or fail to resolve the host.

The Postgres container publishes `5432:5432`, so `localhost` reaches it while the stack is running:

```bash
docker compose -f compose/docker-compose.yml up -d db
```

> Set it back to `db` before rebuilding the backend image. `.env` is copied in at build time, so a container built with `localhost` can't reach Postgres at all.

### 2. Make the model change

Edit the model, and add it to [`app/db/base.py`](../backend/app/db/base.py) if it's a new one.

### 3. Generate the migration

From the `backend/` directory:

```bash
alembic -c app/db/migrations/alembic.ini revision --autogenerate -m "<message>"
```

Use a message that describes the change — it becomes part of the filename, which is how anyone finds this migration again.

### 4. Read what it generated

Autogenerate is a starting point, not an answer. It writes a file into `versions/` with a generated revision id and a `down_revision` chaining it to the previous one. Open it and check the SQL is what you meant — see [What autogenerate gets wrong](#what-autogenerate-gets-wrong) below.

### 5. Apply it

```bash
alembic -c app/db/migrations/alembic.ini upgrade head
```

Then restart the backend so it picks up the new schema. On the next container start `run.sh` runs this same command, so anyone else pulling your branch gets the migration applied automatically.

## What autogenerate gets wrong

It diffs tables and columns. It does not understand intent, and there are a few cases where the generated file is wrong as written.

**Adding a non-nullable column to a table with rows.** This is the common one. A Python-side `default=` isn't applied to existing rows, so the generated `add_column(..., nullable=False)` fails against a populated table. The fix is three steps — add it nullable, backfill, then tighten:

```python
def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("password_updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.execute("""
        UPDATE users
        SET password_updated_at = COALESCE(created_at, CURRENT_TIMESTAMP)
    """)

    op.alter_column(
        "users",
        "password_updated_at",
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
    )
```

See [`b7713f2addc3`](../backend/app/db/migrations/versions/) for the real example.

**Data changes.** Autogenerate never writes them. Anything that has to transform existing rows needs an `op.execute()` you add yourself.

**Column renames** come out as a drop plus an add — which silently destroys the data. Replace them with `op.alter_column(..., new_column_name=...)`.

**Server defaults and constraint changes** are detected inconsistently. Check them by hand.

**The `downgrade()` function is usually the weakest part** of what's generated, because nothing exercises it. Either make it correct or make it honestly raise — a downgrade that half-works is worse than one that refuses.

## Applying migrations elsewhere

**Tests.** [`tests/integration/conftest.py`](../backend/tests/integration/conftest.py) runs `command.upgrade(config, "head")` once per session against the test database, so a new migration is picked up with no extra step. It deliberately runs the real migrations rather than `Base.metadata.create_all()` — `create_all()` builds the schema from the models and would mask a migration that's broken or out of step with them. A migration that fails will fail the integration suite, which is the point.

**Production.** The same `run.sh` runs on the droplet at container start, so deploying a branch applies its migrations. That means a migration failure is a failed deploy — worth remembering when writing one that touches a large table, since the container won't finish starting until it completes.

## Useful commands

All from `backend/`, all needing the `-c` flag:

| Command | Does |
|---|---|
| `alembic -c app/db/migrations/alembic.ini current` | Shows the revision the database is on |
| `alembic -c app/db/migrations/alembic.ini history` | Lists every migration in order |
| `alembic -c app/db/migrations/alembic.ini upgrade head` | Applies everything outstanding |
| `alembic -c app/db/migrations/alembic.ini downgrade -1` | Reverts the most recent migration |
| `alembic -c app/db/migrations/alembic.ini revision -m "<message>"` | Creates an empty migration to write by hand |

## Things worth knowing

**An empty generated migration usually means the model isn't imported** in `app/db/base.py`, or the database is already at the state you're trying to reach.

**`alembic.ini`'s `script_location` is relative to the working directory**, which assumes you run from `backend/`. Running from the project root won't find the scripts. The integration test fixture works around this by overriding it with an absolute path.

**Two branches that each add a migration will conflict** — both will have the same `down_revision`, and Alembic will refuse to run with multiple heads. Fix it by rebasing and editing the later migration's `down_revision` to point at the earlier one.

**Never edit a migration that's already been applied anywhere but your own machine.** Alembic tracks which revisions have run by id; changing one that's already recorded means it won't re-run, and the database quietly diverges from the file. Write a new migration instead.
