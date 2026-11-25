import { Callout } from "../../../components/Docs/Callout"
import { CodeBlock } from "../../../components/Docs/CodeBlock"
import { InlineCode } from "../../../components/Docs/InlineCode"
import { List } from "../../../components/Docs/List"
import { Section } from "../../../components/Docs/Section"

const ENV = `BUCKET_NAME=my-app-uploads
BUCKET_REGION=lon1
BUCKET_ENDPOINT_URL=https://lon1.digitaloceanspaces.com
BUCKET_ACCESS_KEY_ID=your-access-key-id
BUCKET_SECRET_KEY=your-secret-key`

const CHECK = `docker compose -f compose/docker-compose.yml exec backend python -c "
import asyncio
from app.external_services.s3_client import get_s3_client

async def main():
    client = get_s3_client()
    await client.upload_fileobj('checks/hello.txt', b'hello', 'text/plain')
    print(client.generate_presigned_url('checks/hello.txt', expires_in=300))

asyncio.run(main())
"`

export const FileStorage: React.FC = () => (
    <>
        <Section>
            <p>
                The backend can store files in S3-compatible object storage, ready for any feature that needs it. This
                guide uses DigitalOcean Spaces, but AWS S3 and MinIO work with the same code.
            </p>
            <p>
                The bucket stays private. Uploads go through the backend, which can check a file before storing it. To show
                a file, the backend hands the browser a short-lived signed link instead of a public URL.
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
            <p>Upload a test file and print a signed link to it from the backend container:</p>
            <CodeBlock code={CHECK} />
            <p>
                Open the printed link and you should see <InlineCode>hello</InlineCode>. To confirm the bucket is private,
                open the same link without everything after the <InlineCode>?</InlineCode>. It should
                say <strong>Access Denied</strong>. Delete <InlineCode>checks/hello.txt</InlineCode> from the bucket in the
                control panel when you're done.
            </p>
        </Section>

        <Section title="Things worth knowing">
            <List>
                <li>Use <InlineCode>S3Client</InlineCode> from <InlineCode>backend/app/external_services/s3_client.py</InlineCode> for uploads, deletes and signed links.</li>
                <li>Store each file's key in the database, never its URL, and sign a fresh link when you return it.</li>
                <li>nginx rejects request bodies over 1MB by default. If a feature accepts larger uploads, raise <InlineCode>client_max_body_size</InlineCode> for that endpoint in both nginx configs.</li>
                <li>The bucket isn't created by Terraform, so it's managed by hand in the control panel.</li>
            </List>
        </Section>
    </>
)
