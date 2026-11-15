import { Callout } from "../../../components/Docs/Callout"
import { CodeBlock } from "../../../components/Docs/CodeBlock"
import { InlineCode } from "../../../components/Docs/InlineCode"
import { List } from "../../../components/Docs/List"
import { Section } from "../../../components/Docs/Section"
import { Table } from "../../../components/Docs/Table"

const NGINX = `server_name api.yourdomain.com;

ssl_certificate     /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;`

const ISSUE = `# Start the stack, so nginx serves the challenge on port 80
docker compose up -d

# Get the certificate
docker compose run --rm \\
  --entrypoint certbot \\
  certbot certonly \\
  --webroot \\
  --webroot-path=/var/www/certbot \\
  -d api.yourdomain.com

# Load it into nginx
docker compose exec reverse-proxy nginx -s reload`

export const DomainAndHttps: React.FC = () => (
    <>
        <Section>
            <p>The app uses two addresses:</p>
            <Table
                headings={["Address", "Points at", "Certificate from"]}
                rows={[
                    [<InlineCode>yourdomain.com</InlineCode>, "Netlify", "Netlify, automatically"],
                    [<InlineCode>api.yourdomain.com</InlineCode>, "Your server", "Let's Encrypt, on the server"],
                ]}
            />
            <p>Netlify handles its side for you. Most of this step is about the API address.</p>
        </Section>

        <Section title="1. Point your domain">
            <p>At your domain registrar, add an A record for the API:</p>
            <Table
                headings={["Type", "Name", "Value"]}
                rows={[["A", <InlineCode>api</InlineCode>, "Your server's reserved IP address"]]}
            />
            <p>
                Then in Netlify, go to <strong>Domain management → Add a domain</strong> and follow its instructions for
                your main domain.
            </p>
            <p>Wait until the API address resolves before going further:</p>
            <CodeBlock code="dig +short api.yourdomain.com" />
        </Section>

        <Section title="2. Set your domain in nginx">
            <p>
                <InlineCode>reverse_proxy/production/web_server/default.conf</InlineCode> has this boilerplate's domain in
                four places: two <InlineCode>server_name</InlineCode> lines and two certificate paths. Replace all four:
            </p>
            <CodeBlock label="reverse_proxy/production/web_server/default.conf" code={NGINX} />
            <p>Commit it, and let the deployment pipeline build and deploy the new image.</p>
        </Section>

        <Section title="3. Get your certificate">
            <p>Log in to the server and, from <InlineCode>/root</InlineCode>, run:</p>
            <CodeBlock code={ISSUE} />
            <List>
                <li>Certbot asks for your email and to accept the terms. To skip the questions, add <InlineCode>--email you@yourdomain.com --agree-tos --no-eff-email</InlineCode>.</li>
                <li>Add <InlineCode>--dry-run</InlineCode> while testing. Let's Encrypt limits failed attempts, and dry runs don't count.</li>
            </List>
            <Callout>
                Use <InlineCode>--webroot</InlineCode>, not <InlineCode>--standalone</InlineCode>. Certbot remembers the
                method for renewals, and <InlineCode>--standalone</InlineCode> needs port 80, which nginx is already using.
            </Callout>
        </Section>

        <Section title="4. Check it works">
            <CodeBlock code={"curl -I https://api.yourdomain.com/api/v1/health\ncurl -I http://api.yourdomain.com/api/v1/health"} />
            <p>The first should succeed, and the second should redirect to HTTPS.</p>
        </Section>

        <Section title="5. Update your settings">
            <List ordered>
                <li>Make sure <InlineCode>frontend/netlify.toml</InlineCode> points at <InlineCode>https://api.yourdomain.com</InlineCode>, and redeploy the frontend.</li>
                <li>Update <InlineCode>frontend_url</InlineCode> in <InlineCode>backend/app/core/settings/production.py</InlineCode>.</li>
                <li>Update <InlineCode>frontend_url</InlineCode> and <InlineCode>google_redirect_url</InlineCode> in <InlineCode>group_vars/vm01.yml</InlineCode>, then write them to the server and redeploy the backend:</li>
            </List>
            <CodeBlock code="ansible-playbook -i hosts.ini playbooks/environment_variables.yml" />
            <p>Also register the production redirect URI in the Google Cloud Console, if you haven't already.</p>
        </Section>

        <Section title="How renewal works">
            <p>
                Certificates last 90 days. The certbot container checks for renewal every 12 hours, and nginx reloads every
                6 hours to pick up a renewed certificate. There's nothing to schedule.
            </p>
            <p>To check renewal is healthy:</p>
            <CodeBlock code="docker compose run --rm --entrypoint certbot certbot renew --dry-run" />
        </Section>

        <Section title="Things worth knowing">
            <List>
                <li>Renewal fails silently. The uptime alerts in the last step warn you before the certificate expires.</li>
                <li>Changing the domain means editing the nginx config, deploying, and getting a new certificate.</li>
                <li>Certificates are stored in <InlineCode>/root/certbot/conf</InlineCode> on the server. Rebuilding the server deletes them.</li>
            </List>
        </Section>
    </>
)
