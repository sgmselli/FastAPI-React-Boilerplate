from fastapi.concurrency import run_in_threadpool

from app.auth.dependencies import password_hash

# Hashing is deliberately slow, so it runs on a thread to keep the event loop free for other requests
async def hash_password(password: str) -> str:
    return await run_in_threadpool(password_hash.hash, password)

async def verify_password(plain_password: str, hashed_password: str) -> bool:
    return await run_in_threadpool(password_hash.verify, plain_password, hashed_password)
