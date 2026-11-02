from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.utils.health import check_dependencies

router = APIRouter()

@router.get("")
async def health(session: AsyncSession = Depends(get_session)):
    results = await check_dependencies(session)

    if all(result == "ok" for result in results.values()):
        return {"status": "ok"}

    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"status": "error", **results},
    )
