import { Callout } from "../../../components/Docs/Callout"
import { CodeBlock } from "../../../components/Docs/CodeBlock"
import { ExternalLink } from "../../../components/Docs/ExternalLink"
import { InlineCode } from "../../../components/Docs/InlineCode"
import { List } from "../../../components/Docs/List"
import { Section } from "../../../components/Docs/Section"

export const GoogleAnalytics: React.FC = () => (
    <>
        <Section>
            <p>
                Google Analytics only loads when a Measurement ID is set, which in practice means your production site.
                Locally, in tests and in CI nothing loads, and anyone cloning the repository never sends data to your
                account.
            </p>
        </Section>

        <Section title="1. Create a property">
            <List ordered>
                <li>Go to <ExternalLink href="https://analytics.google.com/">Google Analytics</ExternalLink> and sign in.</li>
                <li>Go to <strong>Admin → Create → Property</strong>.</li>
                <li>Name it, set your timezone and currency, and continue through the questions.</li>
                <li>Choose <strong>Web</strong> as the platform, enter your site's URL, and create the stream.</li>
            </List>
        </Section>

        <Section title="2. Copy your Measurement ID">
            <p>
                On the stream details page, copy the <strong>Measurement ID</strong>. It looks
                like <InlineCode>G-XXXXXXXXXX</InlineCode>. It isn't a secret, as it's visible in your site's code.
            </p>
        </Section>

        <Section title="3. Add it to GitHub">
            <p>
                In your repository, go to <strong>Settings → Secrets and variables → Actions → Variables</strong> and
                add <InlineCode>GA_MEASUREMENT_ID</InlineCode> with your Measurement ID.
            </p>
            <p>
                It's built into the frontend on the next deployment, which you'll set up in the <strong>Frontend on
                Netlify</strong> step. To turn analytics off, delete the variable and redeploy.
            </p>
        </Section>

        <Section title="4. Check it works">
            <p>
                Once deployed, open your live site and check <strong>Reports → Realtime</strong> in Google Analytics.
                Your visit should appear within about 30 seconds. If it doesn't:
            </p>
            <List>
                <li>Try a browser without ad blockers. Most of them block Google Analytics.</li>
                <li>In your browser's developer tools, check the Network tab for a request to <InlineCode>googletagmanager.com</InlineCode>.</li>
                <li>Check the ID for typos. A wrong ID fails silently.</li>
            </List>
        </Section>

        <Section title="Tracking your own events">
            <p>Call <InlineCode>gtag</InlineCode> from anywhere in the frontend. Guard the call, as it doesn't exist where analytics isn't loaded:</p>
            <CodeBlock label="typescript" code={"window.gtag?.('event', 'sign_up', { method: 'password' });"} />
        </Section>

        <Section title="Things worth knowing">
            <List>
                <li>Page changes inside the app are tracked automatically, as long as <strong>Enhanced measurement</strong> is on in the stream settings.</li>
                <li>The privacy policy already says Google Analytics is used. If you don't turn it on, edit that section.</li>
            </List>
            <Callout>
                There's no cookie consent banner. Google Analytics sets cookies when it loads, which in the EU and UK
                usually needs consent first. If you have users there, only start analytics once they accept.
            </Callout>
        </Section>
    </>
)
