# Email Delivery

Transactional email goes out through [Brevo](https://www.brevo.com/), behind a small abstraction so the provider can be swapped without touching application code. Sending is meant to happen on a Celery worker rather than in the request, so a slow or failing provider never blocks an API response.

## The design

Four layers, each replaceable:

| Layer | File | Responsibility |
|---|---|---|
| `EmailClient` | [`email_client.py`](../backend/app/external_services/email/email_client.py) | Abstract base class — one `send_email` method |
| `BrevoEmailClient` | [`brevo_email_client.py`](../backend/app/external_services/email/brevo_email_client.py) | Brevo implementation, via the `sib-api-v3-sdk` package |
| `EmailService` | [`email_services.py`](../backend/app/services/email_services.py) | Named, meaningful operations — `send_welcome_email(to_email, name)` |
| Celery task | [`email_tasks.py`](../backend/app/celery/tasks/email_tasks.py) | Runs the send off the request path |

The split matters most at the top and bottom. Routers call `send_welcome_email` and know nothing about Brevo; `EmailService` takes its client by constructor injection, so tests pass a fake and swapping providers means writing one new `EmailClient` subclass and changing a single line.

**Emails are templates, not bodies.** No email copy or HTML is read at runtime. `send_email` passes a Brevo `template_id` and a `params` dictionary, and Brevo renders the content it holds. Changing wording is a Brevo dashboard edit with no deploy. Reference copies of the markup live in [`documentation/email-templates/`](email-templates/) for review and history — see [Create the templates](#2-create-the-templates).

## Why Celery

`sib_api_v3_sdk` is synchronous and makes a blocking HTTPS call. Awaiting that inside a FastAPI route would hold the event loop worker for the duration — normally 200-500ms, but unbounded if Brevo is slow. Registration would then be as slow and as unreliable as your email provider.

Handing it to Celery means the route returns immediately and the send is retried independently of the user's request. Redis is the broker, and the `worker` service in the Compose stack runs the consumer.

## 1. Set up Brevo

1. Create an account at [brevo.com](https://www.brevo.com/) and verify your email.
2. **Senders, Domains & Dedicated IPs** → add and verify the address you'll send from. Brevo rejects sends from unverified senders, so this has to happen before anything works.
3. For production, verify the whole **domain** and add the DKIM and SPF records Brevo gives you to your DNS. Without them, mail lands in spam.
4. **SMTP & API** → **API Keys** → **Generate a new API key**. Copy it — it's shown once.
5. **Turn IP whitelisting off.** Under **SMTP & API** → **Authorised IPs**, make sure the restriction is disabled. When it's on, Brevo rejects API calls from any address not on the list, so sends fail with a 401 from anywhere the list doesn't cover — your laptop, CI, and the droplet all have different addresses, and a droplet rebuild changes its IP again. The symptom is confusing: the key is valid, the template is fine, and every send still fails. If you'd rather keep the restriction on, every one of those addresses has to be listed and kept up to date.

## 2. Create the templates

The HTML for each template is kept in [`documentation/email-templates/`](email-templates/):

| Template | File | Variables |
|---|---|---|
| Welcome | [`welcome.html`](email-templates/welcome.html) | `name` |
| Password reset | [`password-reset.html`](email-templates/password-reset.html) | `name`, `reset_url` |
| Password reset confirmation | [`password-reset-confirmation.html`](email-templates/password-reset-confirmation.html) | `name` |

> **The repository copies are for tracking only.** Brevo is the source of truth — the live template is whatever the dashboard holds, and nothing in this codebase reads these files at runtime. They exist so the markup has a history and can be reviewed in a pull request. Edit the real template in the Brevo UI; if you change the HTML meaningfully, paste it back here so the two don't drift.

For each one:

1. **Campaigns** → **Templates** → **New template**.
2. Switch the editor to raw HTML and paste the file's contents in.
3. Reference variables with `{{ params.name }}` — the `params` prefix is required, and matches the `data` dict passed to `send_email`. The templates already use the right names.
4. Set the subject line in Brevo; it isn't part of the HTML.
5. **Activate** the template. Inactive templates fail at send time.
6. Note the **template ID** from the template list. It's an integer.

Two things to change before sending for real: the brand name in the header, and the placeholder `https://example.com/login` button in the welcome template — that email receives no URL variable, so the link is hardcoded.

### Turn click tracking off on the password reset template

Brevo rewrites links in tracked templates to point at a redirect on its own domain. For the reset email that breaks the feature in two ways: the single-use token passes through and is logged on Brevo's servers, and any corporate mail scanner that pre-fetches links will **redeem the token before the user ever clicks it**.

The symptom is users reporting that reset links say "invalid or expired" the first time they're opened. Disable click tracking for that template specifically.

## 3. Configure

| Variable | Value |
|---|---|
| `BREVO_API_KEY` | The API key from step 1 |
| `FROM_EMAIL` | Your verified sender address |

Locally these go in `backend/.env`; in production they're `brevo_api_key` and `from_email` in `group_vars/vm01.yml`, which the Ansible env playbook renders onto the droplet — see [Server Provisioning](deployment/provisioning.md).

Both default to `None` in [`base.py`](../backend/app/core/settings/base.py), so the app boots fine without them and only fails when a send is attempted.

## 4. Set your template IDs

[`email_templates.py`](../backend/app/enums/email_templates.py) maps a name to each Brevo template:

```python
from enum import Enum

class EmailTemplatesId(Enum):
    WELCOME = 3
    PASSWORD_RESET = 2
    PASSWORD_RESET_CONFIRMATION = 4
```

These are the IDs from one Brevo account — replace each with the ID your own account assigned in step 2. The values must be integers, since they're passed straight through to Brevo's `template_id` field.

Add a member here for each new template rather than passing raw IDs around, so the mapping between a number in the Brevo dashboard and what it's for lives in one place.

> IDs are per-account, so they're the one thing that can't be shared between environments. A separate Brevo account for staging would need different numbers, which today means a code change — moving them into settings is the fix if that ever matters.

That's the only application change needed — everything below is already wired up.

## The path a welcome email takes

Registration is the one flow that sends email today, and it's a useful model for adding others.

1. A user posts to `/api/v1/register`. [`user.py`](../backend/app/router/v1/user.py) creates the row, then calls:

   ```python
   task_send_welcome_email.delay(user.email, user.name)
   ```

2. `.delay()` serialises the arguments, pushes a message onto Redis, and returns immediately. The 201 goes back to the user without waiting for Brevo.
3. The `worker` container picks the message up and runs [`task_send_welcome_email`](../backend/app/celery/tasks/email_tasks.py), which calls `email_service.send_welcome_email`.
4. `EmailService` asks `BrevoEmailClient` for `EmailTemplatesId.WELCOME` with `{"name": name}`, and Brevo renders and delivers it.

The `.delay()` call is wrapped in a `try`/`except` that logs and continues. The user row is already committed by that point, so a Redis outage should cost a welcome email — not turn a successful registration into a 500. The trade-off is that a dropped email is invisible apart from the log line.

**Adding another email** means a template in Brevo, a member on `EmailTemplatesId`, a method on `EmailService`, a task in `email_tasks.py`, and a `.delay()` call at the right moment. Only the last two touch anything outside the email layer.

## The two password reset emails

Password reset follows the same path, and sends twice.

**The link.** `POST /api/v1/auth/password-reset/request` queues `task_send_password_reset_email` with the recipient, their name, and a fully built URL. The router never sends a bare token — [`PasswordResetTokenService.get_reset_url`](../backend/app/services/password_reset_token_services.py) assembles `{frontend_url}/password-reset#token=...`, so the route structure lives in one place and the token sits in the URL fragment, where it never reaches a server and can't land in an access log.

The email is queued whether or not the address has an account, and the API returns the same response either way — anything else would let someone check which addresses are registered.

**The confirmation.** `POST /api/v1/auth/password-reset/confirm` queues `task_send_password_reset_confirmation_email` after the password changes. It carries no link, deliberately: it's sent after a possible account takeover, so a button to click is exactly what an attacker would want to imitate. Its job is to be the tripwire that tells someone their password changed when they didn't change it.

## Testing locally

The `worker` service is already in [`docker-compose.yml`](../compose/docker-compose.yml), so the stack needs no changes:

```bash
docker compose -f compose/docker-compose.yml up --build
docker compose -f compose/docker-compose.yml logs -f worker
```

A healthy worker logs a startup banner listing `task_send_welcome_email` under `[tasks]`. If that list is empty, the `include` in `task_queue.py` is wrong or the module failed to import.

Trigger whatever action queues the email and watch the worker log pick it up. Brevo's **Transactional** → **Logs** page shows delivery status, including bounces that look like successes from the API's side.

> `.env` is copied into the image at build time, so rebuild after adding the Brevo keys rather than just restarting.

## Things worth knowing

**A queued email is fire-and-forget.** Nothing records whether the send succeeded, and the registration response is long gone by the time it runs. The worker log and Brevo's transactional log are the only places a failure shows up.

**`email_service` is instantiated at import.** The last line of [`email_services.py`](../backend/app/services/email_services.py) constructs a `BrevoEmailClient` at module scope, which reads `settings.brevo_api_key` immediately. Importing that module without the key configured gets you a client that fails on first use rather than a clear configuration error.

**Failed sends are retried, then given up on.** `BrevoEmailClient.send_email` logs and re-raises, and the task is decorated with `autoretry_for=(Exception,)`, `retry_backoff=True`, `retry_jitter=True` and `max_retries=5`. Celery re-queues on any exception with exponentially increasing delays, so a transient Brevo outage resolves itself. After the fifth attempt the task fails for good and the email is lost — nothing escalates.

`autoretry_for=(Exception,)` is deliberately broad: it retries permanent failures too, like an invalid template ID or a malformed address. Those burn all five attempts and still fail. Narrow it to the SDK's transport exceptions if that noise becomes a problem.

**Brevo's free tier caps at 300 emails a day**, counted across transactional and campaign sends. Exceeding it returns an API error, which the task will retry five times and then drop.

**A result backend is configured but unused.** `task_queue.py` sets Redis as both broker and backend. Nothing reads task results, and storing them for fire-and-forget sends just accumulates keys in Redis. Drop the `backend` argument unless you plan to poll for status.
