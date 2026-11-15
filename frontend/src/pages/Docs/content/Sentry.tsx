import { Callout } from "../../../components/Docs/Callout"
import { CodeBlock } from "../../../components/Docs/CodeBlock"
import { ExternalLink } from "../../../components/Docs/ExternalLink"
import { InlineCode } from "../../../components/Docs/InlineCode"
import { List } from "../../../components/Docs/List"
import { Section } from "../../../components/Docs/Section"
import { Table } from "../../../components/Docs/Table"

const BACKEND_TEST = `docker exec backend python -c "import sentry_sdk; from app.utils.sentry import init_sentry; init_sentry(); sentry_sdk.capture_message('Sentry test'); sentry_sdk.flush()"`

export const Sentry: React.FC = () => (
    <>
        <Section>
            <p>
                Sentry collects errors, with stack traces, from the backend, the Celery worker and the frontend. It also
                stores the backend's logs. It's off unless you add your Sentry keys, so local runs, tests and CI send
                nothing.
            </p>
            <p>
                Personal data is left out: no request bodies, cookies or IP addresses are sent, and the frontend sends no
                user details.
            </p>
        </Section>

        <Section title="1. Create the projects">
            <List ordered>
                <li>
                    Sign up at <ExternalLink href="https://sentry.io">sentry.io</ExternalLink> and create an organisation.
                    Pick the <strong>EU</strong> data region if GDPR applies. It can't be changed later.
                </li>
                <li>
                    Create two projects: <strong>FastAPI</strong> for the backend, with error monitoring and logging,
                    and <strong>React</strong> for the frontend, with error monitoring.
                </li>
                <li>For each, copy the DSN from <strong>Settings → Projects → your project → Client Keys (DSN)</strong>.</li>
            </List>
        </Section>

        <Section title="2. Set up the backend">
            <p>Add the backend DSN to your production settings:</p>
            <CodeBlock label="infrastructure/ansible/group_vars/vm01.yml" code={'sentry_dsn: "https://<key>@o<id>.ingest.de.sentry.io/<id>"'} />
            <p>Then, from <InlineCode>infrastructure/ansible</InlineCode>, write it to the server and restart the containers:</p>
            <CodeBlock code={"ansible-playbook -i hosts.ini playbooks/environment_variables.yml\nansible-playbook -i hosts.ini playbooks/deploy.yml"} />
        </Section>

        <Section title="3. Set up the frontend">
            <p>
                Create a token under <strong>Settings → Developer Settings → Organization Tokens</strong>. Then add these
                in GitHub, under <strong>Settings → Secrets and variables → Actions</strong>:
            </p>
            <Table
                headings={["Name", "Type", "Value"]}
                rows={[
                    [<InlineCode>SENTRY_AUTH_TOKEN</InlineCode>, "Secret", "The organisation token"],
                    [<InlineCode>SENTRY_ORG</InlineCode>, "Variable", "Your organisation's slug"],
                    [<InlineCode>SENTRY_PROJECT_FRONTEND</InlineCode>, "Variable", "The React project's slug"],
                    [<InlineCode>SENTRY_DSN_FRONTEND</InlineCode>, "Variable", "The React project's DSN"],
                ]}
            />
            <p>
                In the React project, set <strong>Settings → Security & Privacy → Allowed Domains</strong> to your domain.
                The DSN is visible in your site's code, so this stops other sites sending errors with it.
            </p>
            <p>
                The next frontend deployment uploads source maps to Sentry, then deletes them before publishing. Stack
                traces show your original files without making your source public.
            </p>
            <Callout>
                Only variables starting with <InlineCode>VITE_</InlineCode> reach the browser. Never give a secret that
                prefix.
            </Callout>
        </Section>

        <Section title="4. Check it works">
            <List>
                <li>
                    <strong>Frontend:</strong> on your live site, run this in the browser console. The error should appear
                    in Sentry with <InlineCode>.tsx</InlineCode> file names:
                </li>
            </List>
            <CodeBlock label="browser console" code={'setTimeout(() => { throw new Error("Sentry test") })'} />
            <List>
                <li><strong>Backend:</strong> on the server, run:</li>
            </List>
            <CodeBlock code={BACKEND_TEST} />
            <p>
                If nothing arrives, check the GitHub variable names match exactly, and look for{" "}
                <InlineCode>[sentry-vite-plugin]</InlineCode> errors in the deployment log. Both fail without breaking the
                deployment.
            </p>
        </Section>

        <Section title="Testing locally">
            <p>
                Set <InlineCode>SENTRY_DSN</InlineCode> in <InlineCode>backend/.env</InlineCode> and/or{" "}
                <InlineCode>VITE_SENTRY_DSN</InlineCode> in <InlineCode>frontend/.env.local</InlineCode>, then rebuild.
                Errors are tagged <InlineCode>development</InlineCode>. Remove the DSNs when you're done.
            </p>
        </Section>
    </>
)
