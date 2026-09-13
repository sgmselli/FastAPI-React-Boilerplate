# File Storage

Uploads go to an S3-compatible object store — DigitalOcean Spaces by default, though the same code works against AWS S3 or MinIO. [`s3_client.py`](../backend/app/external_services/s3_client.py) wraps `boto3` with the three operations the app needs: upload, delete, and generating a presigned URL to read an object back.

> **Nothing calls this yet.** `S3Client` has no callers anywhere in `app/`, and the module currently can't be imported at all — see [The missing exception module](#the-missing-exception-module).

## How it's put together

```python
self.s3 = boto3.client(
    "s3",
    region_name=settings.bucket_region,
    endpoint_url=settings.bucket_endpoint_url,
    aws_access_key_id=settings.bucket_access_key_id,
    aws_secret_access_key=settings.bucket_secret_key,
    config=Config(s3={'addressing_style': 'virtual'})
)
```

Two details make this provider-agnostic. **`endpoint_url`** points boto3 at something other than AWS — omit it and you get S3 proper; set it to `https://lon1.digitaloceanspaces.com` and you get Spaces. **`addressing_style: 'virtual'`** puts the bucket in the hostname (`bucket.lon1.digitaloceanspaces.com`) rather than the path, which is what Spaces expects and what AWS has moved to.

The client is instantiated once at module scope — `s3_client = S3Client()` — so importing the module builds it, and anything boto3 validates up front fails at **import time** rather than on first use.

Credentials aren't checked then (no network call is made), but `endpoint_url` is parsed immediately:

```
ValueError: Invalid endpoint: x
```

That's what a placeholder value in `.env` gets you. An *unset* endpoint is fine — boto3 falls back to AWS's own — so a half-filled config fails louder than an empty one.

## 1. Create a bucket

In the DigitalOcean control panel: **Spaces Object Storage** → **Create a Spaces Bucket**.

1. Pick a region. It doesn't have to match your droplet, but the same region means lower latency and no cross-region transfer.
2. Name it — globally unique within the region.
3. Leave file listing **restricted**. The app hands out presigned URLs, so nothing needs to be publicly readable.

> **Terraform doesn't create this.** There's no `digitalocean_spaces_bucket` resource in [`infrastructure/terraform/`](../infrastructure/terraform/), so unlike the droplet and registry, the bucket is created by hand and isn't captured in state.

## 2. Create access keys

**API** → **Spaces Keys** → **Generate New Key**. You get an access key and a secret; the secret is shown once.

These are separate from the personal access token used by Terraform — Spaces uses S3-style credentials, and the DO API token has no authority over object storage.

## 3. Configure

| Variable | Example | Notes |
|---|---|---|
| `BUCKET_NAME` | `my-app-uploads` | Bucket name only, no URL |
| `BUCKET_REGION` | `lon1` | Region slug |
| `BUCKET_ENDPOINT_URL` | `https://lon1.digitaloceanspaces.com` | Region endpoint, **without** the bucket name |
| `BUCKET_ACCESS_KEY_ID` | | From step 2 |
| `BUCKET_SECRET_KEY` | | From step 2 |

Locally these live in `backend/.env`; in production they're the `bucket_*` keys in `group_vars/vm01.yml`, rendered onto the droplet by the Ansible env playbook — see [Server Provisioning](deployment/provisioning.md).

`BUCKET_ENDPOINT_URL` is the common mistake. Because `addressing_style` is `virtual`, boto3 prepends the bucket itself. Including it in the endpoint produces `my-app-uploads.my-app-uploads.lon1.digitaloceanspaces.com` and a DNS failure that doesn't obviously point at config.

All five default to `None` in [`base.py`](../backend/app/core/settings/base.py), so the app boots without them.

## The missing exception module

Every method raises `S3ClientException`, imported at the top of the file:

```python
from app.exceptions.s3 import S3ClientException
```

**That module doesn't exist.** `app/exceptions/` contains only `user.py`, so importing `s3_client` raises `ModuleNotFoundError`. It stays hidden because nothing imports it yet — the first router that does will fail at startup.

Create `backend/app/exceptions/s3.py`, following the style of [`user.py`](../backend/app/exceptions/user.py):

```python
class S3ClientException(Exception):
    def __init__(self, message: str = "An error occurred with object storage."):
        super().__init__(message)
```

## Using it

### Uploading

```python
from app.external_services.s3_client import s3_client

@router.post("/documents")
async def upload_document(file: UploadFile, current_user: User = Depends(...)):
    object_name = f"documents/{current_user.id}/{uuid4()}.pdf"
    await s3_client.upload_fileobj(object_name, file)
    return {"object_name": object_name}
```

`upload_fileobj` reads the `UploadFile` into memory and pushes it up with three fixed headers: `ContentType: application/pdf`, `ContentDisposition: inline` so browsers render rather than download it, and `CacheControl: public, max-age=31536000, immutable`.

That cache header is only safe because the key is unique per upload — an immutable object that gets overwritten will keep serving the old version from caches for a year. Generate a fresh key (a UUID, as above) rather than reusing one.

**Store the object name, not a URL.** URLs expire; the key is the durable reference. Put it in a column on whatever record owns the file.

### Reading back with presigned URLs

The bucket is private, so there's no public link to hand out. A presigned URL is a temporary, signed link to one object:

```python
url = s3_client.generate_presigned_url(object_name, expires_in=3600)
```

The signature is computed locally from your secret key — no API call — and encodes the object, the expiry, and the permitted operation. Anyone holding the URL can fetch that object until it expires, so treat it as a bearer token: fine in an authenticated API response, not fine in a log or a shared link.

Generate them per request rather than storing them. An hour is the default; shorten it for sensitive files.

### Deleting

```python
s3_client.delete_object(object_name)
```

S3 deletes are idempotent — removing a key that isn't there succeeds silently, so this won't raise on a double delete. It also won't tell you the key was wrong.

Note this one is **synchronous** while `upload_fileobj` is `async`, so it's called without `await`.

## Things worth knowing

**Every upload is labelled as a PDF.** `ContentType` is hardcoded to `application/pdf` in `upload_fileobj`. Upload a PNG and the object will still claim to be a PDF, and browsers will act on that header rather than the bytes. Pass the type through from `file.content_type` if you need anything beyond PDFs.

**The upload blocks the event loop.** `upload_fileobj` is declared `async` and does `await file.read()`, but `self.s3.upload_fileobj(...)` is boto3's synchronous call — it holds the worker for the whole transfer. The `async` keyword makes it look safe when it isn't. For large files, run it in a threadpool with `run_in_threadpool`, or hand it to Celery the way email is handled.

**Whole files are buffered in memory.** `await file.read()` followed by `BytesIO(...)` means a 500MB upload costs 500MB of RAM, on a droplet whose default size is 512MB total. Passing `file.file` straight to boto3 would stream it instead.

**Uploads go through your server.** The browser sends the file to FastAPI, which forwards it to the bucket — so every byte crosses the droplet twice and counts against its bandwidth. The alternative is a presigned **PUT** URL, letting the browser upload directly. `generate_presigned_url` is hardcoded to `get_object`, so that would need a new method.

**There's no way to check an object exists.** The client offers upload, delete, and presign, and nothing else. A presigned URL for a missing key is generated happily and 404s when followed.

**Nothing cleans up orphans.** Deleting a database row doesn't delete its object. Whatever owns the file has to call `delete_object` too, or the bucket accumulates objects nothing references — and you're billed for them.
