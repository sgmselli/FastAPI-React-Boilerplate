import { Callout } from "../../../components/Docs/Callout"
import { CodeBlock } from "../../../components/Docs/CodeBlock"
import { InlineCode } from "../../../components/Docs/InlineCode"
import { List } from "../../../components/Docs/List"
import { Section } from "../../../components/Docs/Section"
import { Table } from "../../../components/Docs/Table"

const ROLLBACK = `ssh root@<your-reserved-ip>
cd /root
docker image tag registry.digitalocean.com/<registry>/app:backend-previous \\
  registry.digitalocean.com/<registry>/app:backend-latest
docker rollout --wait-after-healthy 10 backend`

export const CiCd: React.FC = () => (
    <>
        <Section>
            <p>
                Two things happen automatically with GitHub Actions: <strong>pull requests are tested</strong>, and{" "}
                <strong>merges to main are deployed</strong>. The workflows are in <InlineCode>.github/workflows/</InlineCode>,
                and there's nothing to install. With the secrets from the previous step in place, they're ready to run.
            </p>
        </Section>

        <Section title="On every pull request">
            <p>Each part of the app is only tested when something in it changed. Draft pull requests are skipped.</p>
            <Table
                headings={["Workflow", "Runs"]}
                rows={[
                    ["Backend tests", "Migrations, then the unit and integration tests against real PostgreSQL and Redis"],
                    ["Frontend tests", "Lint, type checks, the unit tests and a production build"],
                    ["End-to-end tests", "The whole app in Docker, driven by Playwright"],
                ]}
            />
            <p>
                If the end-to-end tests fail, download the Playwright report from the run's summary page. It's kept for
                7 days.
            </p>
        </Section>

        <Section title="On every merge to main">
            <p>The deployment workflow runs these steps, skipping any that aren't affected by the change:</p>
            <List ordered>
                <li>Work out whether the backend, frontend or both changed.</li>
                <li>Run the tests for whatever changed.</li>
                <li>Build the backend and reverse proxy images and push them to your registry.</li>
                <li>Deploy the backend: pull the images, run migrations, and swap in the new backend with no downtime.</li>
                <li>Build the frontend and publish it to Netlify.</li>
            </List>
            <p>Two merges close together queue up, so a deployment always finishes before the next one starts.</p>
        </Section>

        <Section title="1. Make your first deployment">
            <p>
                Merge a change to <InlineCode>main</InlineCode>, or run it by hand: go to <strong>Actions → CD → Run
                workflow</strong> and tick <InlineCode>deploy_backend</InlineCode>. Running it by hand is also how you
                redeploy after changing your production settings.
            </p>
            <p>Once it finishes, check the containers are running on the server:</p>
            <CodeBlock code={'ssh root@<your-reserved-ip> "docker ps"'} />
            <p>
                The frontend deploy will fail until Netlify is set up in the next step.
            </p>
        </Section>

        <Section title="How zero-downtime deploys work">
            <List ordered>
                <li>A new backend container starts next to the old one.</li>
                <li>Once its health check passes, nginx starts sending traffic to both.</li>
                <li>The old container gets 30 seconds to finish its requests, then stops.</li>
            </List>
            <p>
                If the new container never becomes healthy, it's removed and the old one keeps serving. The deploy fails
                in Actions, but users never see the broken release.
            </p>
            <Callout>
                Only the backend works this way. A change to the reverse proxy drops connections for about a second, and
                a restarted worker interrupts any task it's running.
            </Callout>
        </Section>

        <Section title="Rolling back">
            <p>
                Each deployment keeps the previous backend image on the server. To switch back to it without downtime:
            </p>
            <CodeBlock code={ROLLBACK} />
            <p>
                The next deployment replaces it again, so follow up by reverting the bad commit on <InlineCode>main</InlineCode>.
                Rolling back the code doesn't roll back the database, which is why migrations must work with the previous
                release.
            </p>
        </Section>

        <Section title="Things worth knowing">
            <List>
                <li>A failing frontend test doesn't stop the frontend deploying. The backend path doesn't have this gap.</li>
                <li>End-to-end tests only run on pull requests, so anything pushed straight to <InlineCode>main</InlineCode> skips them.</li>
                <li>
                    If you make the backend tests a required check, frontend-only pull requests wait forever for a job
                    that was skipped. Require the <InlineCode>changes</InlineCode> jobs instead.
                </li>
            </List>
        </Section>
    </>
)
