import { Callout } from "../../../components/Docs/Callout"
import { CodeBlock } from "../../../components/Docs/CodeBlock"
import { InlineCode } from "../../../components/Docs/InlineCode"
import { Table } from "../../../components/Docs/Table"
import { Section } from "../../../components/Docs/Section"
import { List } from "../../../components/Docs/List"
import { ExternalLink } from "../../../components/Docs/ExternalLink"

const TEMPLATES_URL = "https://github.com/sgmselli/FastAPI-React-Boilerplate/tree/main/documentation/email-templates"

const templates = [
    { name: "Welcome", file: "welcome.html", variables: "name" },
    { name: "Password reset", file: "password-reset.html", variables: "name, reset_url" },
    { name: "Password reset confirmation", file: "password-reset-confirmation.html", variables: "name" },
    { name: "Account deleted", file: "account-deleted.html", variables: "name" },
    { name: "Verify email", file: "verify-email.html", variables: "name, code" },
]

const TEMPLATE_IDS = `class EmailTemplatesId(Enum):
    WELCOME = 3
    PASSWORD_RESET = 2
    PASSWORD_RESET_CONFIRMATION = 4
    ACCOUNT_DELETED = 5
    ONE_TIME_PASSWORD = 6`

export const EmailDelivery: React.FC = () => {

    return (
        <>
            <Section>
                <p>
                    Emails are sent through Brevo. Sending happens in the background on the Celery worker, so a slow or
                    failing email provider never holds up a request.
                </p>
                <p>
                    The app starts without email set up, but sign up sends a verification code by email. Until this step
                    is done, new accounts can't be verified.
                </p>
            </Section>

            <Section title="1. Set up Brevo">
                <List ordered>
                    <li>Create an account at <ExternalLink href="https://www.brevo.com/">brevo.com</ExternalLink> and verify your email.</li>
                    <li>
                        Under <span className="font-semibold">Senders, Domains & Dedicated IPs</span>, add and verify the
                        address you'll send from. Brevo rejects sends from unverified senders.
                    </li>
                    <li>
                        Under <span className="font-semibold">SMTP & API → API Keys</span>, generate a new API key and copy
                        it. It's only shown once.
                    </li>
                    <li>
                        Under <span className="font-semibold">SMTP & API → Authorised IPs</span>, turn the IP restriction
                        off.
                    </li>
                </List>
                <Callout>
                    With the IP restriction on, Brevo rejects calls from any address not on its list, including your
                    machine, CI and your server. Every send fails even though the key is valid.
                </Callout>
                <p>
                    For production, verify your whole domain in Brevo and add the DKIM and SPF records it gives you to your
                    DNS. Without them, emails land in spam.
                </p>
            </Section>

            <Section title="2. Create the email templates">
                <p>
                    Email content lives in Brevo as templates, so you can change the wording without a deploy. The HTML for
                    each one is in <ExternalLink href={TEMPLATES_URL}>documentation/email-templates</ExternalLink>:
                </p>
                <Table
                    headings={["Template", "File", "Variables"]}
                    rows={templates.map(({ name, file, variables }) => [
                        name,
                        <span className="font-mono text-sm whitespace-nowrap">{file}</span>,
                        <span className="font-mono text-sm">{variables}</span>,
                    ])}
                />
                <p>For each template:</p>
                <List ordered>
                    <li>Go to <span className="font-semibold">Campaigns → Templates → New template</span>.</li>
                    <li>Switch the editor to raw HTML and paste in the file's contents.</li>
                    <li>Set the subject line. It isn't part of the HTML.</li>
                    <li><span className="font-semibold">Activate</span> the template. Inactive templates fail when sent.</li>
                    <li>Note the template's ID from the template list.</li>
                </List>
                <p>
                    The templates already reference their variables as <InlineCode>{"{{ params.name }}"}</InlineCode>. Before
                    sending for real, change the brand name in the header and the placeholder login link in the welcome
                    template.
                </p>
                <Callout>
                    Turn click tracking off for the password reset template. Brevo rewrites tracked links, and email
                    scanners that open links in advance can use up the single-use reset token before the user clicks it.
                </Callout>
            </Section>

            <Section title="3. Add your keys">
                <p>Add the API key and your verified sender address to the backend environment:</p>
                <CodeBlock label="backend/.env" code={"BREVO_API_KEY=your-api-key\nFROM_EMAIL=hello@your-domain.com"} />
            </Section>

            <Section title="4. Set your template IDs">
                <p>
                    Each email is mapped to its Brevo template ID in one place. Replace these numbers with the IDs from
                    your own Brevo account:
                </p>
                <CodeBlock label="backend/app/enums/email_templates.py" code={TEMPLATE_IDS} />
                <p>The IDs are whole numbers, as they're passed straight through to Brevo.</p>
            </Section>

            <Section title="5. Check it works">
                <p>
                    Rebuild so the new environment values are picked up, and follow the worker's logs:
                </p>
                <CodeBlock code={"docker compose -f compose/docker-compose.yml up --build\ndocker compose -f compose/docker-compose.yml logs -f worker"} />
                <p>
                    Register a new account. The worker log shows the verification email being sent, and the code should
                    arrive in your inbox. Brevo's <span className="font-semibold">Transactional → Logs</span> page shows
                    the delivery status of every email, including bounces.
                </p>
            </Section>

            <Section title="Things worth knowing">
                <List>
                    <li>
                        A failed send is retried up to five times with increasing delays, then dropped. The worker log and
                        Brevo's logs are the only places a failure shows up.
                    </li>
                    <li>Brevo's free plan allows 300 emails a day.</li>
                    <li>
                        Adding a new email means a template in Brevo, a new ID in <InlineCode>EmailTemplatesId</InlineCode>,
                        a method on <InlineCode>EmailService</InlineCode>, a Celery task, and a call to queue it.
                    </li>
                </List>
            </Section>
        </>
    )
}
