from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Message, Thread


class MessageService:
    @staticmethod
    async def get_or_create_thread(
        db: AsyncSession, client_id: str, freelancer_id: str, job_id: str
    ) -> Thread:
        result = await db.execute(
            select(Thread).where(
                Thread.client_id == client_id,
                Thread.freelancer_id == freelancer_id,
                Thread.job_id == job_id,
            )
        )
        thread = result.scalar_one_or_none()
        if not thread:
            thread = Thread(
                client_id=client_id,
                freelancer_id=freelancer_id,
                job_id=job_id,
            )
            db.add(thread)
            await db.flush()
        return thread

    @staticmethod
    async def send_system_message(
        db: AsyncSession,
        thread: Thread,
        sender_id: str,
        receiver_id: str,
        content: str,
    ) -> Message:
        msg = Message(
            sender_id=sender_id,
            receiver_id=receiver_id,
            content=content,
            thread_id=thread.id,
        )
        db.add(msg)
        await db.flush()
        return msg
