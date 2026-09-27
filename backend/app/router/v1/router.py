from fastapi import APIRouter

from app.router.v1 import user
from app.router.v1.auth import  password_auth, google_auth, password_reset

router = APIRouter()

router.include_router(user.router, prefix="/user", tags=["user"])

router.include_router(password_auth.router, prefix="/auth", tags=["auth"])
router.include_router(google_auth.router, prefix="/auth/google", tags=["google_auth"])
router.include_router(password_reset.router, prefix="/auth/password-reset", tags=["password_reset"])
