import { Callout } from "../../../components/Docs/Callout"
import { CodeBlock } from "../../../components/Docs/CodeBlock"
import { InlineCode } from "../../../components/Docs/InlineCode"
import { List } from "../../../components/Docs/List"
import { Section } from "../../../components/Docs/Section"
import { Table } from "../../../components/Docs/Table"

export const UptimeAndAlerts: React.FC = () => (
    <>
        <Section>
            <p>
                DigitalOcean checks your API from outside the server and watches the server's resources, emailing you when
                something is wrong. This catches what Sentry can't: if the server, nginx or the database is down, nothing
                is running to report the error.
            </p>
        </Section>

        <Section title="The health check">
            <p>
                <InlineCode>/api/v1/health</InlineCode> checks PostgreSQL and Redis, each with a 2 second timeout. It
                returns <InlineCode>200</InlineCode> when both are fine, or <InlineCode>503</InlineCode> naming what failed:
            </p>
            <CodeBlock label="json" code={'{"status": "error", "database": "ok", "redis": "unavailable"}'} />
            <p>Brevo and the bucket aren't checked, as their errors already reach Sentry.</p>
        </Section>

        <Section title="The alerts">
            <Table
                headings={["Alert", "Fires when"]}
                rows={[
                    ["Down", "The health check fails from every region for 2 minutes"],
                    ["Slow", "Responses take over 2 seconds for 5 minutes"],
                    ["Certificate expiry", "The certificate expires in under 14 days, which means renewal has broken"],
                    ["CPU", "Above 80% for 10 minutes"],
                    ["Memory", "Above 90% for 10 minutes"],
                    ["Disk", "Above 80% for 5 minutes"],
                ]}
            />
        </Section>

        <Section title="1. Check the health endpoint">
            <p>Make sure your backend is deployed and healthy first, or the down alert fires straight away:</p>
            <CodeBlock code="curl https://api.yourdomain.com/api/v1/health" />
            <p>It should return <InlineCode>{'{"status":"ok"}'}</InlineCode>.</p>
        </Section>

        <Section title="2. Add the alert settings">
            <CodeBlock
                label="infrastructure/terraform/terraform.tfvars"
                code={'alert_email      = "you@example.com"\nhealth_check_url = "https://api.yourdomain.com/api/v1/health"'}
            />
            <Callout>
                The email must belong to a member of your DigitalOcean team, or alerts aren't delivered.
            </Callout>
        </Section>

        <Section title="3. Create the alerts">
            <p>From <InlineCode>infrastructure/terraform</InlineCode>:</p>
            <CodeBlock code={"terraform plan\nterraform apply"} />
            <p>
                The plan should only add resources, with nothing changed or destroyed. Afterwards, check the uptime check
                under <strong>Monitoring → Uptime</strong> and the alerts under <strong>Monitoring → Alerts</strong> in
                the control panel.
            </p>
        </Section>

        <Section title="When an alert fires">
            <Table
                headings={["Alert", "Look at first"]}
                rows={[
                    ["Down", "Call the health URL. A 503 names what failed. No response means the server, nginx or DNS, so run docker ps on the server"],
                    ["Slow", "Sentry for errors, and docker stats for a busy container"],
                    ["Certificate expiry", "docker logs certbot for renewal errors"],
                    ["CPU or memory", "docker stats to find the container"],
                    ["Disk", "df -h, then docker system df. Old images are the usual cause, removed with docker image prune"],
                ]}
            />
        </Section>

        <Section title="You're done">
            <p>
                Your app is running in production, deploying automatically, and watched for errors and downtime. From
                here, it's yours to build on.
            </p>
            <List>
                <li>Each new model needs a migration, as in the <strong>Database migrations</strong> step.</li>
                <li>Keep migrations safe for zero-downtime deploys.</li>
                <li>Back up <InlineCode>group_vars/vm01.yml</InlineCode> and your Terraform state.</li>
            </List>
        </Section>
    </>
)
