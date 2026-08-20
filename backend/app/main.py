from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.router.v1.router import router
from app.core.config import settings

def create_app() -> FastAPI:
    _app = FastAPI(**settings.fast_api_kwargs)
    _app.include_router(router, prefix=settings.api_v1_prefix)
    _app.add_middleware(
        SessionMiddleware,
        secret_key=settings.session_secret_key
    )
    _app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allow_origins,
        allow_credentials=settings.allow_credentials,
        allow_methods=settings.allow_methods,
        allow_headers=settings.allow_headers,
    )
    return _app

app = create_app()
