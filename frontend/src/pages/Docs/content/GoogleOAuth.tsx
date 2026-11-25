import { Callout } from "../../../components/Docs/Callout"
import { CodeBlock } from "../../../components/Docs/CodeBlock"
import { ExternalLink } from "../../../components/Docs/ExternalLink"
import { InlineCode } from "../../../components/Docs/InlineCode"
import { List } from "../../../components/Docs/List"
import { Section } from "../../../components/Docs/Section"
import { Table } from "../../../components/Docs/Table"

const ENV = `GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URL=http://localhost:3000/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:3000
SESSION_SECRET_KEY=any-random-string`

export const GoogleOAuth: React.FC = () => (
    <>
        <Section>
            <p>
                Sign in with Google is already built. The buttons show on the login and sign up pages, but the flow fails
                at Google's consent screen until you add your own credentials.
            </p>
            <p>
                If someone signs in with Google using an email that already has an account, the two are linked rather
                than creating a duplicate.
            </p>
        </Section>

        <Section title="1. Create a Google Cloud project">
            <List ordered>
                <li>Go to the <ExternalLink href="https://console.cloud.google.com/">Google Cloud Console</ExternalLink>.</li>
                <li>Open the project dropdown in the top left and choose <strong>New Project</strong>. Name it, create it, and make sure it's selected.</li>
            </List>
        </Section>

        <Section title="2. Configure the consent screen">
            <List ordered>
                <li>Go to <strong>APIs & Services → OAuth consent screen</strong>.</li>
                <li>Choose <strong>External</strong>, unless everyone signing in is in your Google Workspace organisation.</li>
                <li>Fill in the app name, a support email and a developer contact email.</li>
                <li>Keep the default scopes. The app only asks for the user's email and profile.</li>
                <li>While the app is in <strong>Testing</strong>, add your own Google account as a test user, or you'll be blocked at the consent screen.</li>
            </List>
            <p>
                Before going live, add links to your privacy policy and terms and conditions under <strong>Branding</strong>.
                The next step, <strong>Legal pages</strong>, covers updating them and which links to add.
            </p>
        </Section>

        <Section title="3. Create the credentials">
            <List ordered>
                <li>Go to <strong>APIs & Services → Credentials → Create Credentials → OAuth client ID</strong>.</li>
                <li>Choose <strong>Web application</strong>.</li>
                <li>Under <strong>Authorised redirect URIs</strong>, add the callback for each environment:</li>
            </List>
            <Table
                headings={["Environment", "Redirect URI"]}
                rows={[
                    ["Local", <span className="font-mono text-sm">http://localhost:3000/api/v1/auth/google/callback</span>],
                    ["Production", <span className="font-mono text-sm">https://yourdomain.com/api/v1/auth/google/callback</span>],
                ]}
            />
            <p>Create it, then copy the <strong>Client ID</strong> and <strong>Client secret</strong>.</p>
            <Callout>
                The redirect URI must match exactly. A trailing slash, <InlineCode>http</InlineCode> instead
                of <InlineCode>https</InlineCode>, or a different port all count as a different URI and
                cause a <InlineCode>redirect_uri_mismatch</InlineCode> error.
            </Callout>
        </Section>

        <Section title="4. Add your credentials">
            <CodeBlock label="backend/.env" code={ENV} />
            <List>
                <li><InlineCode>GOOGLE_REDIRECT_URL</InlineCode> is sent to Google, and must match a redirect URI you registered.</li>
                <li><InlineCode>FRONTEND_URL</InlineCode> is where the browser goes after signing in. If it's wrong, sign in succeeds but lands on the wrong page.</li>
                <li><InlineCode>SESSION_SECRET_KEY</InlineCode> signs the session used during sign in. Without it, the callback fails.</li>
            </List>
            <p>Rebuild so the new values are picked up:</p>
            <CodeBlock code="docker compose -f compose/docker-compose.yml up --build" />
        </Section>

        <Section title="5. Test it">
            <p>
                Go to <ExternalLink href="http://localhost:3000/login">http://localhost:3000/login</ExternalLink> and
                click <strong>Sign in with Google</strong>. You should land back on these docs, signed in.
            </p>
        </Section>

        <Section title="Troubleshooting">
            <p>Failures return a generic error, so check the backend logs for the real one:</p>
            <CodeBlock code={'docker compose -f compose/docker-compose.yml logs backend | grep "Google OAuth callback error"'} />
            <Table
                headings={["Symptom", "Cause"]}
                rows={[
                    [<InlineCode>redirect_uri_mismatch</InlineCode>, "GOOGLE_REDIRECT_URL doesn't exactly match a registered redirect URI"],
                    ["\"Access blocked: app not verified\"", "The app is in Testing and your account isn't a test user"],
                    ["Error straight away, logs mention state or session", "SESSION_SECRET_KEY isn't set"],
                    ["Signs in but lands on the wrong page", "FRONTEND_URL is wrong. Check it has no trailing slash"],
                    [<InlineCode>invalid_client</InlineCode>, "The client ID or secret is wrong, or from a different project"],
                ]}
            />
        </Section>
    </>
)
