# File Storage

Uploaded files live in S3-compatible object storage — DigitalOcean Spaces by default, though the same code works against AWS S3 or MinIO. The bucket is **private**: nothing in it can be read by a plain URL. The backend uploads and deletes objects with its own credentials, and hands the browser short-lived **presigned URLs** when it needs to display one.

Profile pictures are the first feature built on it, and the reference for adding more.

## The design

| Layer | File | Responsibility |
|---|---|---|
| `S3Client` | [`s3_client.py`](../backend/app/external_services/s3_client.py) | Wraps `boto3` — upload, delete, quiet delete, presign |
| `process_profile_picture` | [`images.py`](../backend/app/utils/images.py) | Validates an upload and re-encodes it as a 512×512 WebP |
| `UserProfileService` | [`user_profile_services.py`](../backend/app/services/user_profile_services.py) | Uploads, replaces and deletes a profile's picture, keeping the database and bucket in step |
| `UserProfileResponse` | [`user_profile.py`](../backend/app/schema/user_profile.py) | Turns the stored key into a presigned `profile_picture_url` on every response |

Who talks to the bucket, for each operation:

| Operation | How | Path |
|---|---|---|
| Upload / replace | `S3Client.upload_fileobj` | Browser → FastAPI → bucket |
| Delete | `S3Client.delete_object` | Browser → FastAPI → bucket |
| Read | Presigned GET URL | Browser → bucket directly |

**Writes go through the server.** That lets the backend check the bytes really are an image, strip metadata and resize before anything is stored, and record the object's key in the same request. The cost — every upload crossing the droplet — is small for files capped at 5MB. For large files (video, big documents) the better pattern is a presigned **PUT**, letting the browser upload directly; `S3Client` doesn't implement that yet.

**Reads go direct.** Serving images through FastAPI would cost a request, a worker and bandwidth per image. A presigned URL lets the browser fetch straight from the bucket while still keeping it private.

## Why the bucket is private

A public bucket means anyone holding — or guessing — an object's URL can read it forever, and with file listing on, anyone can enumerate every object in it. User uploads shouldn't work that way.

So the bucket stays private, and access is granted per object, per request:

- **The database stores the key, never a URL.** `user_profiles.profile_picture_key` holds something like `profile-pictures/142/5f51078d….webp`. The key is the durable reference; it's never sent to the browser.
- **A presigned URL is generated per response.** `profile_picture_url` is signed every time a user is returned from the API, and expires after `profile_picture_url_expire_seconds` (an hour by default).
- **Signing is local.** The signature is computed from the secret key with no network call, so generating one per response is cheap.

A presigned URL is a bearer token: anyone holding it can fetch that one object until it expires. That's fine in an authenticated API response, but keep them out of logs and shared links.

Two consequences worth knowing:

- **A URL can expire while the page is open.** If the browser needs to re-fetch the image after the hour is up, it 404s. The frontend falls back to the default image, and the next `/user/current` call returns a fresh URL.
- **Every response has a new URL.** The signature changes, so browsers re-download the image after each user fetch. At 512px WebP that's tens of kilobytes.

## 1. Create a bucket

In the DigitalOcean control panel: **Spaces Object Storage** → **Create Bucket**.

1. **Region** — pick the same region as your droplet (e.g. `lon1`). It doesn't have to match, but the same region means lower latency and no cross-region transfer.
2. **CDN** — leave it **off**. A CDN serves objects publicly, which is the opposite of what presigned URLs are for.
3. **Name** — must be unique within the region. This is your `BUCKET_NAME`.
4. **File listing** — leave it **Restricted**. With listing enabled, anyone can request the bucket's root URL and get an index of every object in it.

Once it's created, check the bucket's **Settings** tab: file listing should say restricted, and there's no CORS configuration to add — the browser only ever performs simple GETs against presigned URLs, and uploads go through the backend.

> **Terraform doesn't create this.** There's no `digitalocean_spaces_bucket` resource in [`infrastructure/terraform/`](../infrastructure/terraform/), so unlike the droplet and registry, the bucket is created by hand and isn't captured in state.

### Keep objects private

Restricting file listing hides the index, but each object has its own permissions too. The app never sets an ACL when uploading, so objects are created **private** — leave it that way:

- Don't pass `ACL: "public-read"` in `upload_fileobj`'s `ExtraArgs`.
- Don't use the control panel's **Make public** option on individual files.

You can check by opening an object's plain URL in a browser — `https://<bucket>.lon1.digitaloceanspaces.com/<key>`. It should return **Access Denied**. The `profile_picture_url` from the API, with its `X-Amz-…` query string, should load.

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

All five default to `None` in [`base.py`](../backend/app/core/settings/base.py), so the app boots without them. The boto3 client is only built on the first storage call, so missing or wrong values don't break unrelated requests — uploads fail with a 502, and `profile_picture_url` comes back `null`.

### The endpoint mistake

`BUCKET_ENDPOINT_URL` is the one that catches people. DigitalOcean shows the bucket's own URL — `https://my-app-uploads.lon1.digitaloceanspaces.com` — prominently in the control panel, and it's tempting to paste that. Don't.

The client uses virtual-hosted addressing (`addressing_style: 'virtual'`), so boto3 puts the bucket in the hostname itself. With the bucket already in the endpoint, it ends up there twice:

```
SSL validation failed for https://my-app-uploads.my-app-uploads.lon1.digitaloceanspaces.com/...
hostname 'my-app-uploads.my-app-uploads.lon1.digitaloceanspaces.com' doesn't match
either of '*.lon1.digitaloceanspaces.com', 'lon1.digitaloceanspaces.com'
```

The certificate only covers one level of subdomain, so the request fails before reaching the bucket. Use the region endpoint, `https://lon1.digitaloceanspaces.com`.

## Profile pictures

### Endpoints

| Method | Path | Body | Returns |
|---|---|---|---|
| `PUT` | `/api/v1/profile/current/picture` | `multipart/form-data` with a `file` field | `UserResponse` |
| `DELETE` | `/api/v1/profile/current/picture` | — | `UserResponse` |

Both return the updated user, with `profile.profile_picture_url` set to a fresh presigned URL or `null`. `null` means the frontend shows its default image.

| Status | When |
|---|---|
| `422` | Not an image, not JPEG/PNG/WebP/HEIC/AVIF, over 5MB, or over 40 megapixels — `detail` says which |
| `502` | The upload to the bucket failed |
| `401` | Not signed in |

### What happens on upload

1. **Validate** — the format is read from the bytes, not the client's `Content-Type`, so a renamed PDF is rejected. Dimensions are checked from the header before decoding, so a small file declaring enormous dimensions can't exhaust memory.
   Accepted formats are JPEG, PNG, WebP, HEIC and AVIF — see [Phone photo formats](#phone-photo-formats).
2. **Re-encode** — EXIF rotation is applied, the image is centre-cropped to a square, resized to 512×512 and saved as WebP. Re-encoding drops all metadata, including GPS location.
3. **Upload** under a new key, `profile-pictures/{user_id}/{uuid}.webp`. Every upload gets a fresh key because objects are stored with `Cache-Control: immutable` — overwriting a key would leave caches serving the old image for a year.
4. **Save** the key on the profile.
5. **Delete the previous picture**, if there was one.

Validation and resizing run in a threadpool, and boto3's synchronous calls are wrapped in `run_in_threadpool`, so neither blocks the event loop.

### Phone photo formats

| Device | Default camera format |
|---|---|
| iPhone (iOS 11+) | HEIC — or JPEG if *Settings → Camera → Formats* is set to *Most Compatible* |
| Android | JPEG on almost all phones; some Samsung and Pixel models offer HEIF as an opt-in |

**HEIC** is decoded by [`pillow-heif`](https://github.com/bigcat88/pillow_heif), registered as a Pillow plugin at the top of [`images.py`](../backend/app/utils/images.py). Its wheels bundle libheif, so the Docker image needs no system packages. **AVIF** is built into Pillow 12.

Whatever arrives is re-encoded to WebP, so the stored object and what browsers display are the same for every input format — including browsers that can't show HEIC themselves.

Two browser quirks the frontend handles:

- **iOS converts on its own** when the file input's `accept` list doesn't mention HEIC, handing the server a JPEG. Because ours does list it, iPhones send the original HEIC and the server converts it instead.
- **Desktop Chrome and Firefox on Windows often report HEIC with an empty `type`**, so [`ProfilePictureInput`](../frontend/src/components/ProfilePictureInput/ProfilePictureInput.tsx) also accepts files by extension. The backend's check on the bytes is still the one that counts.

### Orphans

The database and the bucket can't share a transaction, so the code is ordered to fail safe:

- If the upload fails, the profile is untouched.
- If saving the key fails, the just-uploaded object is deleted.
- Removing an old object uses `delete_object_quietly`, which logs a failure instead of raising. The profile no longer points at that object, so failing to remove it only leaves an orphan — not worth failing the user's request over.
- **Deleting an account deletes its picture.** The database cascade removes the profile row but knows nothing about the bucket, so `DELETE /user/current` calls `delete_profile_picture` first.

Orphans are logged as `Failed to delete object …, it is now orphaned in the bucket`. Nothing sweeps them up automatically — search the logs for that line if you need to clean up by hand.

### Limits

| Setting | Default | |
|---|---|---|
| `profile_picture_max_bytes` | 5MB | Largest accepted upload |
| `profile_picture_max_pixels` | 40,000,000 | Largest accepted width × height |
| `profile_picture_size` | 512 | Output width and height |
| `profile_picture_url_expire_seconds` | 3600 | Presigned URL lifetime |

All live in [`base.py`](../backend/app/core/settings/base.py) and can be overridden per environment.

**nginx has its own limit.** Its default `client_max_body_size` is 1MB, which would reject most photos before they reach FastAPI. Both [development](../reverse_proxy/development/web_server/default.conf) and [production](../reverse_proxy/production/web_server/default.conf) configs set it to `6m` — the 5MB limit plus room for multipart encoding. Raise both together if you raise `profile_picture_max_bytes`. The config is baked into the `reverse_proxy` image, so rebuild it after changing.

## Using `S3Client` for something new

Get the client through FastAPI's dependency injection, as `UserProfileService` does:

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

Follow the same rules as profile pictures:

- **Store the key, not the URL**, in a column on whatever owns the file.
- **Use a fresh key per upload** (a UUID), because uploads are marked immutable.
- **Prefix keys by feature** (`documents/{user_id}/…`) so objects are easy to find and clean up.
- **Delete the object when its owner goes**, including when an account is deleted.

## Testing

No test talks to a real bucket.

- **Unit tests** build a mock with `make_mock_s3_client()` from [`tests/unit/mocks.py`](../backend/tests/unit/mocks.py) and pass it to the service. Its `generate_presigned_url` returns `https://bucket.test/<key>?signed`, so tests can assert which key was signed.
- **Integration tests** use the `s3_client` fixture from [`tests/integration/conftest.py`](../backend/tests/integration/conftest.py). It overrides the `get_s3_client` dependency *and* patches the response schema, which looks the client up directly to sign URLs.
- **The client itself** is covered by [`test_s3_client.py`](../backend/tests/unit/external_services/test_s3_client.py), which replaces the underlying boto3 client with a mock.
