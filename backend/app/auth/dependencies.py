from fastapi.security import OAuth2PasswordBearer
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

# OWASP's minimum Argon2id settings (19 MiB, 2 iterations) - pwdlib's default
# of 64 MiB per hash is a lot on a 1GB droplet when logins arrive together
password_hash = PasswordHash((Argon2Hasher(time_cost=2, memory_cost=19456, parallelism=1),))
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"/api/v1/auth/login")
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)
