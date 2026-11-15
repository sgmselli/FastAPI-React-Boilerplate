import { Callout } from "../../../components/Docs/Callout"
import { CodeBlock } from "../../../components/Docs/CodeBlock"
import { ExternalLink } from "../../../components/Docs/ExternalLink"
import { InlineCode } from "../../../components/Docs/InlineCode"
import { List } from "../../../components/Docs/List"
import { Section } from "../../../components/Docs/Section"
import { Table } from "../../../components/Docs/Table"

export const DigitalOceanAccount: React.FC = () => (
    <>
        <Section>
            <p>
                The backend runs on DigitalOcean. Before anything can be built there, you need three things: an account
                with billing set up, an access token so Terraform can create resources for you, and an SSH key so you and
                GitHub Actions can reach the server.
            </p>
            <p>This step only creates those. Building the server comes next.</p>
        </Section>

        <Section title="1. Create an account">
            <List ordered>
                <li>Sign up at <ExternalLink href="https://cloud.digitalocean.com/registrations/new">digitalocean.com</ExternalLink> and verify your email.</li>
                <li>Add a payment method. Nothing can be created until you do.</li>
            </List>
            <p>
                New accounts are sometimes reviewed for a few hours. If Terraform later fails with a <InlineCode>403</InlineCode>,
                check for a banner in the control panel first.
            </p>
            <Callout>
                This costs money. The defaults create a small server, a reserved IP address and a container registry.
                Check DigitalOcean's pricing for the current cost.
            </Callout>
        </Section>

        <Section title="2. Create an access token">
            <List ordered>
                <li>In the control panel, go to <strong>API → Tokens → Generate New Token</strong>.</li>
                <li>Choose <strong>Full Access</strong>. Read-only isn't enough, as Terraform creates and deletes resources with it.</li>
                <li>Copy the token. It's only shown once.</li>
            </List>
            <p>Create Terraform's settings file and add the token to it:</p>
            <CodeBlock code={"cd infrastructure/terraform\ncp terraform.tfvars.example terraform.tfvars"} />
            <CodeBlock label="infrastructure/terraform/terraform.tfvars" code={'do_token = "dop_v1_..."'} />
            <p>
                <InlineCode>terraform.tfvars</InlineCode> is ignored by Git. Keep it that way, as the token gives full
                access to your account.
            </p>
        </Section>

        <Section title="3. Create an SSH key">
            <CodeBlock code={'ssh-keygen -t ed25519 -C "your@email.com" -f ~/.ssh/id_ed25519'} />
            <Callout>
                Keep the filename <InlineCode>id_ed25519</InlineCode>. The Ansible settings expect the key at that path.
            </Callout>
            <p>Print the public key and add the whole line to <InlineCode>terraform.tfvars</InlineCode>:</p>
            <CodeBlock code="cat ~/.ssh/id_ed25519.pub" />
            <CodeBlock label="infrastructure/terraform/terraform.tfvars" code={'ssh_public_key = "ssh-ed25519 AAAA... your@email.com"'} />
            <p>
                Don't upload the key in the control panel. Terraform adds it to the server for you, and a copy uploaded
                by hand clashes with it.
            </p>
        </Section>

        <Section title="4. Choose a registry name">
            <p>
                Pick a name for your container registry and add it to <InlineCode>terraform.tfvars</InlineCode>. It must
                be unique across all of DigitalOcean, so common names are taken.
            </p>
            <CodeBlock label="infrastructure/terraform/terraform.tfvars" code={'registry_name = "your-unique-registry-name"'} />
        </Section>

        <Section title="What you should have now">
            <Table
                headings={["Value", "Where it goes"]}
                rows={[
                    ["Access token", <><InlineCode>do_token</InlineCode> in terraform.tfvars, and later a GitHub secret</>],
                    ["Public key", <><InlineCode>ssh_public_key</InlineCode> in terraform.tfvars</>],
                    ["Private key", "Stays on your machine, and later a GitHub secret"],
                    ["Registry name", <><InlineCode>registry_name</InlineCode> in terraform.tfvars</>],
                ]}
            />
        </Section>
    </>
)
