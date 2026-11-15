import { Callout } from "../../../components/Docs/Callout"
import { CodeBlock } from "../../../components/Docs/CodeBlock"
import { InlineCode } from "../../../components/Docs/InlineCode"
import { List } from "../../../components/Docs/List"
import { Section } from "../../../components/Docs/Section"
import { Table } from "../../../components/Docs/Table"

const ENV = `BUCKET_NAME=my-app-uploads
BUCKET_REGION=lon1
BUCKET_ENDPOINT_URL=https://lon1.digitaloceanspaces.com
BUCKET_ACCESS_KEY_ID=your-access-key-id
BUCKET_SECRET_KEY=your-secret-key`

export const FileStorage: React.FC = () => (
    <>
        <Section>
            <p>
                Uploaded files, like profile pictures, are stored in S3-compatible object storage. This guide uses
                DigitalOcean Spaces, but AWS S3 and MinIO work with the same code.
            </p>
            <p>
                The bucket stays private. Uploads go through the backend, which checks and resizes images before storing
                them. To show a file, the backend hands the browser a short-lived signed link instead of a public URL.
            </p>
            <p>
                You'll need a DigitalOcean account. If you don't have one yet, create it as described in
                the <strong>DigitalOcean account</strong> step, then come back here.
            </p>
        </Section>

        <Section title="1. Create a bucket">
            <p>In the DigitalOcean control panel, go to <strong>Spaces Object Storage → Create Bucket</strong>:</p>
            <List ordered>
                <li><strong>Region:</strong> pick the same region you'll use for your server, for example <InlineCode>lon1</InlineCode>.</li>
                <li><strong>CDN:</strong> leave it off. A CDN serves files publicly.</li>
                <li><strong>Name:</strong> this becomes your <InlineCode>BUCKET_NAME</InlineCode>.</li>
                <li><strong>File listing:</strong> leave it <strong>Restricted</strong>, so nobody can list every file in the bucket.</li>
            </List>
            <p>There's no CORS configuration to add.</p>
        </Section>

        <Section title="2. Create access keys">
            <p>Go to <strong>Spaces Object Storage → Access Keys → Create Access Key</strong>:</p>
            <List>
                <li>Choose <strong>Limited Access</strong>, select only this bucket, and grant <strong>Read/Write/Delete</strong>.</li>
                <li>Copy the <strong>access key ID</strong> and <strong>secret key</strong>. The secret is only shown once.</li>
            </List>
            <p>Use separate keys, and ideally separate buckets, for development and production.</p>
        </Section>

        <Section title="3. Add your bucket settings">
            <CodeBlock label="backend/.env" code={ENV} />
            <Callout>
                Use the region endpoint for <InlineCode>BUCKET_ENDPOINT_URL</InlineCode>, without the bucket name. The
                control panel shows the bucket's own URL, but using it puts the bucket name in the address twice and every
                upload fails with an SSL error.
            </Callout>
            <p>Rebuild the backend and worker so the new values are picked up:</p>
            <CodeBlock code="docker compose -f compose/docker-compose.yml up -d --build backend worker" />
        </Section>

        <Section title="4. Test it">
            <p>
                Go to <strong>Settings</strong>, upload a profile picture, and check it appears. To confirm the bucket is
                private, open a file's plain URL in your browser. It should say <strong>Access Denied</strong>.
            </p>
        </Section>

        <Section title="Things worth knowing">
            <Table
                headings={["Limit", "Default"]}
                rows={[
                    ["Largest upload", "5MB"],
                    ["Accepted formats", "JPEG, PNG, WebP, HEIC and AVIF"],
                    ["Stored size", "512×512 WebP, with metadata like location removed"],
                    ["Signed link lifetime", "1 hour"],
                ]}
            />
            <List>
                <li>The limits live in <InlineCode>backend/app/core/settings/base.py</InlineCode>. If you raise the upload size, raise <InlineCode>client_max_body_size</InlineCode> in both nginx configs too.</li>
                <li>The bucket isn't created by Terraform, so it's managed by hand in the control panel.</li>
                <li>Deleting an account also deletes its profile picture from the bucket.</li>
            </List>
        </Section>
    </>
)
