import asyncio
import logging

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Notification

logger = logging.getLogger("freeledger.notifications")


class NotificationService:
    @staticmethod
    async def create(
        db: AsyncSession,
        user_id: str,
        type: str,
        title: str,
        body: str | None = None,
        metadata: dict | None = None,
    ) -> Notification:
        notif = Notification(
            user_id=user_id,
            type=type,
            title=title,
            body=body,
            metadata_=metadata,
        )
        db.add(notif)
        await db.flush()

        unread = await NotificationService.get_unread_count(db, user_id)

        event = {
            "type": "NOTIFICATION",
            "notification": {
                "id": notif.id,
                "title": notif.title,
                "body": notif.body or "",
                "unread_count": unread,
                "type": notif.type,
            },
        }

        from app.websocket_manager import manager
        asyncio.create_task(manager.send_to_user(user_id, event))
        asyncio.create_task(manager.publish_to_redis(event))

        return notif

    @staticmethod
    async def get_unread_count(db: AsyncSession, user_id: str) -> int:
        result = await db.execute(
            select(func.count()).where(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
        )
        return result.scalar() or 0

    @staticmethod
    async def mark_read(db: AsyncSession, notification_id: str, user_id: str) -> bool:
        result = await db.execute(
            update(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            ).values(is_read=True)
        )
        return result.rowcount > 0

    @staticmethod
    async def get_notifications(
        db: AsyncSession,
        user_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Notification]:
        result = await db.execute(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(result.scalars().all())
