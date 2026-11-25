import { Callout } from "../../../components/Docs/Callout"
import { ExternalLink } from "../../../components/Docs/ExternalLink"
import { InlineCode } from "../../../components/Docs/InlineCode"
import { List } from "../../../components/Docs/List"
import { Section } from "../../../components/Docs/Section"
import { Table } from "../../../components/Docs/Table"

export const LegalPages: React.FC = () => (
    <>
        <Section>
            <p>
                The app comes with a privacy policy and terms and conditions, linked from the footer and the sign up page.
                They're written for this boilerplate, so they name it as the website and describe content it doesn't
                have. Make them your own before you launch.
            </p>
            <Callout>
                These pages are a starting point, not legal advice. What they need to say depends on where you and your
                users are and what your app does, so have them checked if you're unsure.
            </Callout>
        </Section>

        <Section title="1. Update the privacy policy">
            <p>Edit <InlineCode>frontend/src/pages/PrivacyPolicy/PrivacyPolicy.tsx</InlineCode>:</p>
            <List>
                <li>Replace <strong>FastAPI + React Boilerplate</strong> with your website's name.</li>
                <li>Check the information you collect matches what your app actually stores.</li>
                <li>Keep the third-party services in step with what you use, such as Google Analytics, Sentry, Brevo and your file storage provider.</li>
                <li>Add a <strong>Last Updated</strong> date at the top. Section 7 refers to one, but it isn't there yet.</li>
                <li>Add a way to contact you about privacy, such as an email address.</li>
            </List>
        </Section>

        <Section title="2. Update the terms and conditions">
            <p>Edit <InlineCode>frontend/src/pages/TermsAndConditions/TermsAndConditions.tsx</InlineCode>:</p>
            <List>
                <li>Replace <strong>FastAPI + React Boilerplate</strong> with your website's name.</li>
                <li>Rewrite <strong>Use of the Website</strong>, <strong>Intellectual Property</strong> and <strong>Downloads</strong>, which describe guitar tabs and music sheets as example content.</li>
                <li>Set <strong>Governing Law</strong> to the country or state you operate from.</li>
            </List>
        </Section>

        <Section title="3. Link them in Google sign in">
            <p>
                People who sign up with Google never see the policies checkbox on the sign up page. Google shows your links
                on its consent screen instead, and asks for them before you can publish the app.
            </p>
            <List ordered>
                <li>In the <ExternalLink href="https://console.cloud.google.com/">Google Cloud Console</ExternalLink>, open the project from the <strong>Google OAuth</strong> step.</li>
                <li>Go to <strong>APIs & Services → OAuth consent screen → Branding</strong>.</li>
                <li>Fill in the links below with your production domain, and add the domain under <strong>Authorised domains</strong>.</li>
                <li>Save.</li>
            </List>
            <Table
                headings={["Field", "Value"]}
                rows={[
                    ["Application home page", <span className="font-mono text-sm">https://yourdomain.com</span>],
                    ["Application privacy policy link", <span className="font-mono text-sm">https://yourdomain.com/privacy-policy</span>],
                    ["Application terms of service link", <span className="font-mono text-sm">https://yourdomain.com/terms-and-conditions</span>],
                ]}
            />
            <p>
                Your domain isn't live until the <strong>Domain and HTTPS</strong> step. You can fill these in now, but
                Google can only check them once the pages load.
            </p>
        </Section>
    </>
)
