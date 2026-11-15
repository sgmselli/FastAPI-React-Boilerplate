import { useAuth } from "../../../contexts/auth"
import { Callout } from "../../../components/Docs/Callout"
import { CodeBlock } from "../../../components/Docs/CodeBlock"
import { InlineCode } from "../../../components/Docs/InlineCode"
import { Section } from "../../../components/Docs/Section"
import { List } from "../../../components/Docs/List"
import { ExternalLink } from "../../../components/Docs/ExternalLink"

const REPOSITORY_URL = "https://github.com/sgmselli/FastAPI-React-Boilerplate.git"

export const GettingStarted: React.FC = () => {

    const { user } = useAuth();

    return (
        <>
            <Section>
                <p className="text-xl font-semibold text-color">
                    Hey {user?.display_name}, welcome to FastAPI + React Boilerplate 👋
                </p>
                <p>
                    These guides take you from a fresh clone to a production deployment, one step at a time.
                    Start here to get the whole stack running on your machine.
                </p>
                <p>
                    You'll need <span className="font-semibold">Git</span> and <span className="font-semibold">Docker</span> (with
                    Docker Compose) installed.
                </p>
            </Section>

            <Section title="1. Clone the repository">
                <p>Clone the repository into a folder named after your app, and remove the original remote:</p>
                <CodeBlock code={`git clone ${REPOSITORY_URL} [YOUR_APP_NAME]\ncd [YOUR_APP_NAME]\ngit remote remove origin`} />
            </Section>

            <Section title="2. Create your environment file">
                <p>Copy the example environment file in the backend:</p>
                <CodeBlock code={"cd backend\ncp .example.env .env"} />
                <p>
                    Then set the database and Redis values. These point at the <InlineCode>db</InlineCode> and{" "}
                    <InlineCode>redis</InlineCode> services in Docker Compose, not <InlineCode>localhost</InlineCode>:
                </p>
                <CodeBlock
                    label="backend/.env"
                    code={"APP_ENV=DEVELOPMENT\nDATABASE_NAME=boilerplatedb\nDATABASE_USER=dbadmin\nDATABASE_PASSWORD=password\nDATABASE_HOST=db\nREDIS_HOST=redis\nREDIS_PORT=6379\nREDIS_DB=0"}
                />
                <p>
                    Set <InlineCode>OTP_SECRET_KEY</InlineCode> to any random string, as sign up fails without it. The
                    remaining keys can stay empty for now. You'll fill them in as you work through the next steps.
                </p>
                <Callout>
                    The <InlineCode>.env</InlineCode> file is copied into the image when it's built, so after editing it
                    you need to rebuild for the change to take effect.
                </Callout>
            </Section>

            <Section title="3. Start the app">
                <p>From the root of the repository, build and start everything:</p>
                <CodeBlock code="docker compose -f compose/docker-compose.yml up --build" />
                <p>
                    This starts the reverse proxy, frontend, backend, Celery worker, PostgreSQL and Redis. Database
                    migrations run automatically before the backend starts.
                </p>
                <List>
                    <li>
                        Open the app at <ExternalLink href="http://localhost:3000">http://localhost:3000</ExternalLink>.
                    </li>
                    <li>
                        The API docs are at <ExternalLink href="http://localhost:8000/docs">http://localhost:8000/docs</ExternalLink>.
                    </li>
                </List>
                <p>
                    The frontend's dev server sends API calls on <InlineCode>/api</InlineCode> to the reverse proxy on
                    port <InlineCode>80</InlineCode>, which passes them to the backend.
                </p>
            </Section>
        </>
    )
}
