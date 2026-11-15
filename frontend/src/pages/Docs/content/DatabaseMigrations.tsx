import { Callout } from "../../../components/Docs/Callout"
import { CodeBlock } from "../../../components/Docs/CodeBlock"
import { InlineCode } from "../../../components/Docs/InlineCode"
import { Table } from "../../../components/Docs/Table"
import { Section } from "../../../components/Docs/Section"
import { List } from "../../../components/Docs/List"

const ALEMBIC = "alembic -c app/db/migrations/alembic.ini"

const commands = [
    { command: `${ALEMBIC} current`, does: "Shows the revision the database is on" },
    { command: `${ALEMBIC} history`, does: "Lists every migration in order" },
    { command: `${ALEMBIC} upgrade head`, does: "Applies everything outstanding" },
    { command: `${ALEMBIC} downgrade -1`, does: "Reverts the most recent migration" },
]

export const DatabaseMigrations: React.FC = () => {

    return (
        <>
            <Section>
                <p>
                    The database schema is managed with Alembic. Every change to a SQLAlchemy model needs a matching
                    migration, as the schema is never built from the models directly.
                </p>
                <p>
                    You don't need to apply migrations yourself in development. The <InlineCode>migrate</InlineCode> service
                    runs them every time the stack starts, before the backend comes up. You only create them, whenever you
                    change a model.
                </p>
            </Section>

            <Section title="1. Set up a Python environment">
                <p>Alembic runs from your machine, so the backend's dependencies need to be installed locally. From the repository root:</p>
                <CodeBlock code={"cd backend\npython3 -m venv venv\nsource venv/bin/activate\npip install -r requirements.txt"} />
            </Section>

            <Section title="2. Point your environment at the local database">
                <p>
                    Alembic needs to reach the database from your machine, not from inside a container. In{" "}
                    <InlineCode>backend/.env</InlineCode>, change the host:
                </p>
                <CodeBlock label="backend/.env" code="DATABASE_HOST=localhost" />
                <p>Then make sure the database is running:</p>
                <CodeBlock code="docker compose -f compose/docker-compose.yml up -d db" />
                <Callout>
                    Set <InlineCode>DATABASE_HOST</InlineCode> back to <InlineCode>db</InlineCode> before rebuilding the
                    backend. The <InlineCode>.env</InlineCode> file is copied into the image, so a backend built
                    with <InlineCode>localhost</InlineCode> can't reach the database.
                </Callout>
            </Section>

            <Section title="3. Change your model">
                <p>
                    Edit the model in <InlineCode>backend/app/models/</InlineCode>. If it's a new model, import it
                    in <InlineCode>backend/app/db/base.py</InlineCode>, otherwise Alembic won't see it and will generate
                    an empty migration.
                </p>
            </Section>

            <Section title="4. Generate the migration">
                <p>From the <InlineCode>backend</InlineCode> folder, with a message describing the change:</p>
                <CodeBlock code={`${ALEMBIC} revision --autogenerate -m "add bio to user profile"`} />
                <p>
                    This writes a new file into <InlineCode>backend/app/db/migrations/versions/</InlineCode>.
                </p>
            </Section>

            <Section title="5. Review what it generated">
                <p>Autogenerate is a starting point. Open the file and check it does what you meant, especially for:</p>
                <List>
                    <li>
                        <span className="font-semibold">New required columns on tables with rows.</span> Add the column as
                        nullable, fill in existing rows, then make it required.
                    </li>
                    <li>
                        <span className="font-semibold">Renamed columns.</span> These come out as a drop and an add, which
                        deletes the data. Replace them with <InlineCode>op.alter_column(..., new_column_name=...)</InlineCode>.
                    </li>
                    <li>
                        <span className="font-semibold">Data changes.</span> Autogenerate never writes them. Add
                        an <InlineCode>op.execute()</InlineCode> yourself.
                    </li>
                    <li>
                        <span className="font-semibold">The downgrade.</span> Make it correct, or make it raise an error.
                    </li>
                </List>
            </Section>

            <Section title="6. Apply it">
                <CodeBlock code={`${ALEMBIC} upgrade head`} />
                <p>
                    Then restart the backend so it picks up the new schema. Anyone pulling your branch gets the migration
                    applied automatically the next time they start the stack.
                </p>
            </Section>

            <Section title="Keep migrations safe to deploy">
                <p>
                    Deployments have zero downtime, so the previous release keeps running against the new schema until
                    the new one is ready. A migration can add things, but not remove or rename anything the running
                    code still uses:
                </p>
                <List>
                    <li>Add columns as nullable or with a server default.</li>
                    <li>
                        Remove or rename a column in two deployments: first ship code that stops using it, then remove it
                        in a later migration.
                    </li>
                    <li>Never edit a migration that has already run anywhere but your own machine. Write a new one instead.</li>
                </List>
            </Section>

            <Section title="Useful commands">
                <p>All run from the <InlineCode>backend</InlineCode> folder.</p>
                <Table
                    headings={["Command", "Does"]}
                    rows={commands.map(({ command, does }) => [
                        <span className="font-mono text-sm whitespace-nowrap">{command}</span>,
                        does,
                    ])}
                />
            </Section>
        </>
    )
}
