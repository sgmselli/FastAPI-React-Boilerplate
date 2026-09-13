from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.exceptions.user import UserAlreadyExists
from app.schema.user import UserResponse, UserCreate
import app.services.user_services as user_services
from app.models.user import User
from app.auth.current_user import get_current_user_or_raise_http_error
from app.celery.tasks.email_tasks import task_send_welcome_email
from app.utils.logging import Logger, LogLevel

router = APIRouter()

@router.get("/current", response_model=UserResponse)
async def get_current_user_data(current_user: User = Depends(get_current_user_or_raise_http_error)):
    return current_user

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_create: UserCreate, session: AsyncSession = Depends(get_session)):
    try:
        user = await user_services.create_user_with_password(user_create, session)
    except UserAlreadyExists as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    try:
        task_send_welcome_email.delay(user.email, user.name)
    except Exception as e:
        Logger.log(LogLevel.ERROR, f"Failed to queue welcome email for '{user.email}': {e}")

    return user