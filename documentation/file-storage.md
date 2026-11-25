# File Storage

The backend can store files in S3-compatible object storage — DigitalOcean Spaces by default, though the same code works against AWS S3 or MinIO. The bucket is **private**: nothing in it can be read by a plain URL. The backend uploads and deletes objects with its own credentials, and hands the browser short-lived **presigned URLs** when it needs to display one.

No feature uses it yet. [`S3Client`](../backend/app/external_services/s3_client.py) is ready for the first one — see [Using `S3Client`](#using-s3client).

## The design

| Operation | How | Path |
|---|---|---|
| Upload | `S3Client.upload_fileobj` | Browser → FastAPI → bucket |
| Delete | `S3Client.delete_object` | Browser → FastAPI → bucket |
| Read | Presigned GET URL | Browser → bucket directly |

**Writes go through the server.** That lets the backend validate a file before anything is stored, and record the object's key in the same request. For large files (video, big documents) the better pattern is a presigned **PUT**, letting the browser upload directly; `S3Client` doesn't implement that yet.

**Reads go direct.** Serving files through FastAPI would cost a request, a worker and bandwidth per file. A presigned URL lets the browser fetch straight from the bucket while still keeping it private.

## Why the bucket is private

A public bucket means anyone holding — or guessing — an object's URL can read it forever, and with file listing on, anyone can enumerate every object in it. User uploads shouldn't work that way.

So the bucket stays private, and access is granted per object, per request:

- **Store the key, never a URL.** A column on whatever owns the file holds something like `documents/142/5f51078d….pdf`. The key is the durable reference.
- **Generate a presigned URL per response.** Sign it when the owning record is returned from the API, with a short expiry.
- **Signing is local.** The signature is computed from the secret key with no network call, so generating one per response is cheap.

A presigned URL is a bearer token: anyone holding it can fetch that one object until it expires. That's fine in an authenticated API response, but keep them out of logs and shared links.

## 1. Create a bucket

In the DigitalOcean control panel: **Spaces Object Storage** → **Create Bucket**.

1. **Region** — pick the same region as your droplet (e.g. `lon1`). It doesn't have to match, but the same region means lower latency and no cross-region transfer.
2. **CDN** — leave it **off**. A CDN serves objects publicly, which is the opposite of what presigned URLs are for.
3. **Name** — must be unique within the region. This is your `BUCKET_NAME`.
4. **File listing** — leave it **Restricted**. With listing enabled, anyone can request the bucket's root URL and get an index of every object in it.

Once it's created, check the bucket's **Settings** tab: file listing should say restricted, and there's no CORS configuration to add as long as the browser only performs simple GETs against presigned URLs and uploads go through the backend.

> **Terraform doesn't create this.** There's no `digitalocean_spaces_bucket` resource in [`infrastructure/terraform/`](../infrastructure/terraform/), so unlike the droplet and registry, the bucket is created by hand and isn't captured in state.

### Keep objects private

Restricting file listing hides the index, but each object has its own permissions too. The app never sets an ACL when uploading, so objects are created **private** — leave it that way:

- Don't pass `ACL: "public-read"` in `upload_fileobj`'s `ExtraArgs`.
- Don't use the control panel's **Make public** option on individual files.

You can check by opening an object's plain URL in a browser — `https://<bucket>.lon1.digitaloceanspaces.com/<key>`. It should return **Access Denied**. A presigned URL for the same key, with its `X-Amz-…` query string, should load.

## 2. Create access keys

**Spaces Object Storage** → **Access Keys** → **Create Access Key**.

- Choose **Limited Access**, select only this bucket, and grant **Read/Write/Delete**. The app needs all three, but nothing beyond this bucket. A full-access key can read and delete every bucket on the account.
- You get an **access key ID** and a **secret key**. The secret is shown once — copy it now.

These are separate from the personal access token Terraform uses. Spaces uses S3-style credentials, and a DigitalOcean API token has no authority over object storage.

Create separate keys for development and production, ideally against separate buckets, so a leaked local `.env` can't touch production files.

## 3. Configure environment variables

| Variable | Example | Notes |
|---|---|---|
| `BUCKET_NAME` | `my-app-uploads` | Bucket name only — no URL |
| `BUCKET_REGION` | `lon1` | Region slug |
| `BUCKET_ENDPOINT_URL` | `https://lon1.digitaloceanspaces.com` | Region endpoint, **without** the bucket name |
| `BUCKET_ACCESS_KEY_ID` | | From step 2 |
| `BUCKET_SECRET_KEY` | | From step 2 |

**Locally**, these go in `backend/.env` (see [`.example.env`](../backend/.example.env)). `.env` is copied into the backend image at build time, so after changing it, rebuild rather than restart:

```bash
docker compose -f compose/docker-compose.yml up -d --build backend worker
```

**In production**, they're the `bucket_*` keys in `infrastructure/ansible/group_vars/vm01.yml`, rendered onto the droplet by the environment variables playbook — see [Server Provisioning](deployment/provisioning.md) and [Secrets](deployment/secrets.md).

All five default to `None` in [`base.py`](../backend/app/core/settings/base.py), so the app boots without them. The boto3 client is only built on the first storage call, so missing or wrong values don't break unrelated requests — only the storage calls themselves fail, with `S3ClientException`.

### The endpoint mistake

`BUCKET_ENDPOINT_URL` is the one that catches people. DigitalOcean shows the bucket's own URL — `https://my-app-uploads.lon1.digitaloceanspaces.com` — prominently in the control panel, and it's tempting to paste that. Don't.

The client uses virtual-hosted addressing (`addressing_style: 'virtual'`), so boto3 puts the bucket in the hostname itself. With the bucket already in the endpoint, it ends up there twice:

```
SSL validation failed for https://my-app-uploads.my-app-uploads.lon1.digitaloceanspaces.com/...
hostname 'my-app-uploads.my-app-uploads.lon1.digitaloceanspaces.com' doesn't match
either of '*.lon1.digitaloceanspaces.com', 'lon1.digitaloceanspaces.com'
```

The certificate only covers one level of subdomain, so the request fails before reaching the bucket. Use the region endpoint, `https://lon1.digitaloceanspaces.com`.

## Check your settings

With the variables in place, upload, sign and delete a test object from the backend container:

```bash
docker compose -f compose/docker-compose.yml exec backend python -c "
import asyncio
from app.external_services.s3_client import get_s3_client

async def main():
    client = get_s3_client()
    await client.upload_fileobj('checks/hello.txt', b'hello', 'text/plain')
    print(client.generate_presigned_url('checks/hello.txt', expires_in=300))
    input('Open the URL above, then press Enter to delete the object... ')
    await client.delete_object('checks/hello.txt')

asyncio.run(main())
"
```

The printed URL should show `hello`. The same address without its query string should return **Access Denied**.

## Using `S3Client`

Get the client through FastAPI's dependency injection:

```python
from app.external_services.s3_client import S3Client, get_s3_client

def get_document_service(
    session: AsyncSession = Depends(get_session),
    s3_client: S3Client = Depends(get_s3_client)
) -> DocumentService:
    return DocumentService(session, s3_client)
```

`get_s3_client()` returns one cached instance. Outside a request — a Celery task, say — call it directly.

| Method | Notes |
|---|---|
| `await upload_fileobj(key, data, content_type)` | `data` is `bytes` or a file-like object. Raises `S3ClientException`. |
| `await delete_object(key)` | Raises `S3ClientException`. Deleting a missing key succeeds silently. |
| `await delete_object_quietly(key)` | Same, but logs instead of raising — for cleanup that shouldn't fail the request |
| `generate_presigned_url(key, expires_in=3600)` | Synchronous — signing makes no network call. Raises `S3ClientException`. |

When adding a feature that stores files:

- **Store the key, not the URL**, in a column on whatever owns the file.
- **Use a fresh key per upload** (a UUID). Objects are stored with `Cache-Control: immutable`, so overwriting a key would leave caches serving the old file for a year.
- **Prefix keys by feature** (`documents/{user_id}/…`) so objects are easy to find and clean up.
- **Delete the object when its owner goes**, including when an account is deleted. The database cascade knows nothing about the bucket, so do it before deleting the row.
- **Order writes to fail safe.** The database and the bucket can't share a transaction: upload first, delete the new object if saving its key fails, and remove old objects with `delete_object_quietly` so a failed cleanup only leaves an orphan.

## Testing

No test talks to a real bucket.

- **Unit tests** can build a mock with `make_mock_s3_client()` from [`tests/unit/mocks.py`](../backend/tests/unit/mocks.py) and pass it to the service. Its `generate_presigned_url` returns `https://bucket.test/<key>?signed`, so tests can assert which key was signed.
- **Integration tests** can use the `s3_client` fixture from [`tests/integration/conftest.py`](../backend/tests/integration/conftest.py), which overrides the `get_s3_client` dependency. If a response schema looks the client up directly to sign URLs, patch that too.
- **The client itself** is covered by [`test_s3_client.py`](../backend/tests/unit/external_services/test_s3_client.py), which replaces the underlying boto3 client with a mock.
