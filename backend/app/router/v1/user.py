from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.exceptions.user import UserAlreadyExists
from app.schema.user import UserResponse, UserCreate
import app.services.user_services as user_services
from app.models.user import User
from app.auth.current_user import get_current_user_or_raise_http_error

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
    return user