import { Callout } from "../../../components/Docs/Callout"
import { CodeBlock } from "../../../components/Docs/CodeBlock"
import { ExternalLink } from "../../../components/Docs/ExternalLink"
import { InlineCode } from "../../../components/Docs/InlineCode"
import { List } from "../../../components/Docs/List"
import { Section } from "../../../components/Docs/Section"

const PROXY = `[[redirects]]
  from = "/api/*"
  to = "https://api.yourdomain.com/api/:splat"
  status = 200
  force = true`

export const FrontendNetlify: React.FC = () => (
    <>
        <Section>
            <p>
                The frontend is a static build hosted on Netlify. GitHub Actions builds it and uploads the files, so
                Netlify never builds anything itself and doesn't need access to your repository.
            </p>
            <p>
                The app calls its API at <InlineCode>/api</InlineCode> on its own address. Netlify passes those calls on
                to your backend, so there's no API URL to configure, no CORS to set up, and sign in cookies just work.
            </p>
        </Section>

        <Section title="1. Create a site">
            <List ordered>
                <li>Sign up at <ExternalLink href="https://app.netlify.com/">netlify.com</ExternalLink>.</li>
                <li>Choose <strong>Add new site → Deploy manually</strong> and drop in any placeholder folder.</li>
            </List>
            <Callout>
                Don't connect the repository. If Netlify builds on every push as well as GitHub Actions, each merge
                deploys twice and the two can finish in the wrong order.
            </Callout>
        </Section>

        <Section title="2. Copy the site ID">
            <p>
                Go to <strong>Site configuration → General → Site details</strong> and copy the <strong>Site ID</strong>.
                It's a long ID, not the <InlineCode>something.netlify.app</InlineCode> name.
            </p>
        </Section>

        <Section title="3. Create an access token">
            <p>
                Go to <strong>User settings → Applications → Personal access tokens → New access token</strong>, and copy
                it. It's only shown once.
            </p>
        </Section>

        <Section title="4. Add both to GitHub">
            <CodeBlock code={'gh secret set NETLIFY_SITE_ID --body "<the site id>"\ngh secret set NETLIFY_AUTH_TOKEN --body "<the token>"'} />
            <p>Add them at repository level, like the others.</p>
        </Section>

        <Section title="5. Point the frontend at your backend">
            <p>
                <InlineCode>frontend/netlify.toml</InlineCode> is committed with this boilerplate's own API address.
                Change it to your API domain, which you'll set up in the next step:
            </p>
            <CodeBlock label="frontend/netlify.toml" code={PROXY} />
            <Callout>
                If you don't change this, every API call from your live site goes to someone else's server.
            </Callout>
            <p>Commit the change like any other.</p>
        </Section>

        <Section title="6. Deploy">
            <p>
                Merge a frontend change to <InlineCode>main</InlineCode>, or go to <strong>Actions → CD → Run
                workflow</strong> and tick <InlineCode>deploy_frontend</InlineCode>. Check the <strong>Deploys</strong> tab
                in Netlify for the result.
            </p>
            <p>
                Once your API domain is live, load the site and check a request to <InlineCode>/api/v1/...</InlineCode> returns
                JSON. Getting the page's HTML back means the API rule isn't matching.
            </p>
        </Section>

        <Section title="Things worth knowing">
            <List>
                <li>Netlify keeps every deploy. To roll back, open <strong>Deploys</strong>, pick an earlier one and choose <strong>Publish deploy</strong>.</li>
                <li><InlineCode>netlify.toml</InlineCode> also makes every page load the app, so refreshing on any page works.</li>
                <li>Your backend's domain still answers directly. Netlify passes calls through for convenience, not to protect it.</li>
            </List>
        </Section>
    </>
)
