import { Callout } from "../../../components/Docs/Callout"
import { CodeBlock } from "../../../components/Docs/CodeBlock"
import { InlineCode } from "../../../components/Docs/InlineCode"
import { List } from "../../../components/Docs/List"
import { Section } from "../../../components/Docs/Section"

const GROUP_VARS = `---
app_env: PRODUCTION
frontend_url: https://yourdomain.com

database_name: yourdb
database_user: dbadmin
database_password: <a long random string>
database_host: db

bucket_secret_key: <from your bucket's access keys>
bucket_access_key_id: <from your bucket's access keys>
bucket_name: your-bucket
bucket_region: lon1
bucket_endpoint_url: https://lon1.digitaloceanspaces.com

access_secret_key: <random 32+ bytes>
refresh_secret_key: <random 32+ bytes, different from the above>
session_secret_key: <random 32+ bytes, different again>
otp_secret_key: <random 32+ bytes, different again>

google_client_id: <from Google Cloud Console>
google_client_secret: <from Google Cloud Console>
google_redirect_url: https://yourdomain.com/api/v1/auth/google/callback

redis_host: redis
redis_port: 6379
redis_db: 0

brevo_api_key: <from Brevo>
from_email: noreply@yourdomain.com`

export const ServerProvisioning: React.FC = () => (
    <>
        <Section>
            <p>
                Terraform gives you an empty Ubuntu server. Ansible gets it ready to run the app: it installs Docker and
                writes the production settings onto the server. You only do this once. After that, deployments just pull
                new images.
            </p>
        </Section>

        <Section title="1. Install Ansible">
            <CodeBlock code={"brew install ansible\nansible-galaxy collection install community.docker"} />
        </Section>

        <Section title="2. Check Ansible can reach the server">
            <p>
                Make sure <InlineCode>infrastructure/ansible/hosts.ini</InlineCode> has your server's line from the
                previous step, then:
            </p>
            <CodeBlock code={"cd infrastructure/ansible\nansible -i hosts.ini vm01 -m ping"} />
            <p>A <InlineCode>SUCCESS</InlineCode> with <InlineCode>"ping": "pong"</InlineCode> means everything is connected.</p>
        </Section>

        <Section title="3. Write your production settings">
            <p>
                Create <InlineCode>infrastructure/ansible/group_vars/vm01.yml</InlineCode>. There's no example file to
                copy, and it's ignored by Git, as it holds every production secret. Every key must be present, even if
                it's blank:
            </p>
            <CodeBlock label="infrastructure/ansible/group_vars/vm01.yml" code={GROUP_VARS} />
            <p>Generate each of the four secret keys separately, with a different value for each:</p>
            <CodeBlock code="openssl rand -hex 32" />
            <List>
                <li><InlineCode>database_host</InlineCode> must be <InlineCode>db</InlineCode> and <InlineCode>redis_host</InlineCode> must be <InlineCode>redis</InlineCode>. These are the container names, not <InlineCode>localhost</InlineCode>.</li>
                <li><InlineCode>session_secret_key</InlineCode> and <InlineCode>otp_secret_key</InlineCode> are required, even if you don't use Google sign in.</li>
                <li>If your domain isn't set up yet, fill in the URLs now. You'll re-run the settings playbook once it's live.</li>
            </List>
            <Callout>
                This file only exists on your machine. Back it up somewhere safe, or you'll have to recreate every
                production credential by hand.
            </Callout>
        </Section>

        <Section title="4. Install Docker">
            <CodeBlock code="ansible-playbook -i hosts.ini playbooks/provision.yml" />
            <p>
                This takes a few minutes. It installs Docker, Docker Compose and docker-rollout, which is what gives
                deployments zero downtime.
            </p>
        </Section>

        <Section title="5. Write the settings to the server">
            <CodeBlock code="ansible-playbook -i hosts.ini playbooks/environment_variables.yml" />
            <p>
                This writes <InlineCode>/root/.env.backend</InlineCode> and <InlineCode>/root/.env.db</InlineCode> on the
                server. Unlike in development, these aren't built into the image. To change a setting, edit{" "}
                <InlineCode>vm01.yml</InlineCode>, re-run this playbook and restart the containers.
            </p>
        </Section>

        <Section title="6. Point at your registry">
            <p>
                <InlineCode>compose/docker-compose.production.yml</InlineCode> has the registry name written into its image
                paths:
            </p>
            <CodeBlock label="compose/docker-compose.production.yml" code="image: registry.digitalocean.com/fastapi-react-cr/app:backend-latest" />
            <p>
                If your <InlineCode>registry_name</InlineCode> isn't <InlineCode>fastapi-react-cr</InlineCode>, replace it
                in all three places in that file. Otherwise the server tries to pull images from a registry you don't own.
            </p>
        </Section>

        <Section title="What you should have now">
            <p>
                A server with Docker installed, your settings in <InlineCode>/root</InlineCode>, and nothing running yet.
                The app is started by the deployment pipeline, which you'll set up next.
            </p>
        </Section>
    </>
)
