import { Callout } from "../../../components/Docs/Callout"
import { CodeBlock } from "../../../components/Docs/CodeBlock"
import { ExternalLink } from "../../../components/Docs/ExternalLink"
import { InlineCode } from "../../../components/Docs/InlineCode"
import { List } from "../../../components/Docs/List"
import { Section } from "../../../components/Docs/Section"
import { Table } from "../../../components/Docs/Table"

export const Infrastructure: React.FC = () => (
    <>
        <Section>
            <p>
                Everything the backend runs on is defined with Terraform in <InlineCode>infrastructure/terraform/</InlineCode>.
                One command creates it all, so nothing is set up by hand in the control panel.
            </p>
            <Table
                headings={["Resource", "Purpose"]}
                rows={[
                    ["Droplet", "The Ubuntu server everything runs on"],
                    ["Reserved IP", "A fixed public address for the server"],
                    ["VPC", "A private network for the server"],
                    ["Firewall", "Allows SSH, HTTP and HTTPS in"],
                    ["Container registry", "Where CI stores the backend images"],
                    ["Project", "Groups the resources in the control panel"],
                ]}
            />
            <p>
                PostgreSQL and Redis run as containers on the server rather than as managed databases, which keeps the
                cost to a single server.
            </p>
        </Section>

        <Section title="1. Install Terraform">
            <CodeBlock code={"brew install terraform\nterraform -version"} />
            <p>
                You need version 1.6 or newer. For other platforms, see
                the <ExternalLink href="https://developer.hashicorp.com/terraform/install">Terraform install guide</ExternalLink>.
            </p>
        </Section>

        <Section title="2. Check your settings">
            <p>
                <InlineCode>terraform.tfvars</InlineCode> should already have <InlineCode>do_token</InlineCode>,{" "}
                <InlineCode>registry_name</InlineCode> and <InlineCode>ssh_public_key</InlineCode> from the previous step.
                Everything else has a default. These are worth checking before the first run, as changing some of them
                later rebuilds the server:
            </p>
            <Table
                headings={["Setting", "Default", "Notes"]}
                rows={[
                    [<InlineCode>region</InlineCode>, "lon1", "Put it near your users"],
                    [<InlineCode>droplet_size</InlineCode>, "s-1vcpu-1gb", "Size up if the worker runs out of memory"],
                    [<InlineCode>registry_region</InlineCode>, "ams3", "The registry isn't available in lon1, so this must differ from region"],
                    [<InlineCode>registry_tier</InlineCode>, "basic", "The free tier only allows one repository"],
                ]}
            />
        </Section>

        <Section title="3. Create the infrastructure">
            <p>From <InlineCode>infrastructure/terraform</InlineCode>:</p>
            <CodeBlock code={"terraform init\nterraform plan"} />
            <p>
                Read the plan before going further. On the first run it should only create resources, never destroy them.
                Then apply it and type <InlineCode>yes</InlineCode> when asked:
            </p>
            <CodeBlock code="terraform apply" />
            <p>It takes a couple of minutes.</p>
        </Section>

        <Section title="4. Record the outputs">
            <CodeBlock code="terraform output" />
            <List>
                <li>
                    <InlineCode>ansible_inventory_line</InlineCode> goes into <InlineCode>infrastructure/ansible/hosts.ini</InlineCode>,
                    replacing the line under <InlineCode>[vm01]</InlineCode>. The committed line belongs to a previous
                    deployment, so it will be wrong for you.
                </li>
                <li><InlineCode>registry_endpoint</InlineCode> is needed for GitHub in the <strong>Secrets and variables</strong> step.</li>
                <li><InlineCode>app_ip</InlineCode> is your server's address, which your domain will point at later.</li>
            </List>
            <p>Check you can log in to the server:</p>
            <CodeBlock code="ssh root@<your-reserved-ip>" />
            <p>An empty Ubuntu server is what you should see. Installing Docker is the next step.</p>
        </Section>

        <Section title="Things worth knowing">
            <List>
                <li>
                    Changing <InlineCode>region</InlineCode> or the network rebuilds the server with an empty disk, which
                    deletes the database. Resizing the server is done in place.
                </li>
                <li>
                    Terraform's state file is stored locally and ignored by Git. If you lose it, Terraform forgets the
                    resources exist and tries to create duplicates.
                </li>
                <li>Only one person should run <InlineCode>terraform apply</InlineCode> at a time.</li>
            </List>
            <Callout>
                <InlineCode>terraform destroy</InlineCode> deletes everything, including the database. There's no undo.
            </Callout>
        </Section>
    </>
)
