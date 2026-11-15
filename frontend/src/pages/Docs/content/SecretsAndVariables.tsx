import { Callout } from "../../../components/Docs/Callout"
import { CodeBlock } from "../../../components/Docs/CodeBlock"
import { InlineCode } from "../../../components/Docs/InlineCode"
import { List } from "../../../components/Docs/List"
import { Section } from "../../../components/Docs/Section"
import { Table } from "../../../components/Docs/Table"

const GH_COMMANDS = `gh secret set DIGITALOCEAN_ACCESS_TOKEN --body "dop_v1_..."
gh secret set DIGITALOCEAN_SSH_KEY < ~/.ssh/id_ed25519

gh variable set DOCR_REGISTRY --body "your-registry-name"
gh variable set DIGITALOCEAN_HOST_1 --body "<your-reserved-ip>"`

export const SecretsAndVariables: React.FC = () => (
    <>
        <Section>
            <p>Credentials live in three places. None of them are committed to the repository.</p>
            <Table
                headings={["Where", "Holds"]}
                rows={[
                    [<InlineCode>terraform.tfvars</InlineCode>, "DigitalOcean token, SSH public key, registry name"],
                    [<InlineCode>group_vars/vm01.yml</InlineCode>, "Every app secret: database, JWT keys, Google, bucket, Brevo"],
                    ["GitHub Actions", "What the deployment pipeline needs to build and deploy"],
                ]}
            />
            <p>You've done the first two already. This step is the GitHub part.</p>
        </Section>

        <Section title="1. Add the secrets">
            <p>
                In your repository, go to <strong>Settings → Secrets and variables → Actions → Secrets → New repository
                secret</strong>:
            </p>
            <Table
                headings={["Name", "Value"]}
                rows={[
                    [<InlineCode>DIGITALOCEAN_ACCESS_TOKEN</InlineCode>, "Your DigitalOcean access token"],
                    [<InlineCode>DIGITALOCEAN_SSH_KEY</InlineCode>, <>The whole <strong>private</strong> key, from <InlineCode>~/.ssh/id_ed25519</InlineCode></>],
                ]}
            />
            <Callout>
                Paste the private key whole, including the <InlineCode>BEGIN</InlineCode> and <InlineCode>END</InlineCode> lines.
                A cut-off key fails later with a misleading <InlineCode>Permission denied (publickey)</InlineCode> error.
            </Callout>
            <p>
                The Netlify secrets are added in the <strong>Frontend on Netlify</strong> step, once the site exists.
            </p>
        </Section>

        <Section title="2. Add the variables">
            <p>On the same page, open the <strong>Variables</strong> tab:</p>
            <Table
                headings={["Name", "Value"]}
                rows={[
                    [<InlineCode>DOCR_REGISTRY</InlineCode>, "Your registry name"],
                    [<InlineCode>DIGITALOCEAN_HOST_1</InlineCode>, "Your server's reserved IP address"],
                ]}
            />
        </Section>

        <Section title="Or use the GitHub CLI">
            <p>This is quicker, and reads the key straight from the file so it can't be cut off:</p>
            <CodeBlock code={GH_COMMANDS} />
            <p>Check what's set with <InlineCode>gh secret list</InlineCode> and <InlineCode>gh variable list</InlineCode>.</p>
        </Section>

        <Section title="Things worth knowing">
            <List>
                <li>
                    Add everything at <strong>repository</strong> level, not to an environment. The build job doesn't use
                    an environment, so it can't see environment secrets and fails to log in to the registry.
                </li>
                <li>
                    Your server's IP address is in two places: <InlineCode>DIGITALOCEAN_HOST_1</InlineCode> and{" "}
                    <InlineCode>hosts.ini</InlineCode>. If it changes, update both.
                </li>
                <li>
                    If you replace your DigitalOcean token, update it in <InlineCode>terraform.tfvars</InlineCode> and the
                    GitHub secret.
                </li>
            </List>
        </Section>
    </>
)
