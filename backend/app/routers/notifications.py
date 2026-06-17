from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import User
from app.schemas.notifications import NotificationResponse, UnreadCountResponse
from app.services.notification_service import NotificationService
from app.utils.error_codes import ErrorCodes
from app.utils.exceptions import NotFoundError
from app.utils.helpers import pagination_params

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offset, limit = pagination_params(page, limit)
    notifs = await NotificationService.get_notifications(db, current_user.id, limit, offset)
    return [NotificationResponse.model_validate(n) for n in notifs]


@router.get("/unread", response_model=UnreadCountResponse)
async def unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = await NotificationService.get_unread_count(db, current_user.id)
    return UnreadCountResponse(unread_count=count)


@router.patch("/{notification_id}/read", response_model=dict)
async def mark_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ok = await NotificationService.mark_read(db, notification_id, current_user.id)
    if not ok:
        raise NotFoundError("Notification not found", code=ErrorCodes.NOT_FOUND_NOTIFICATION)
    await db.commit()
    return {"status": "ok"}
