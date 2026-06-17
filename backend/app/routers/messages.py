import asyncio

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import Message, User
from app.schemas.schemas import MessageResponse, MessageSend, UserResponse
from app.services.notification_service import NotificationService
from app.utils.error_codes import ErrorCodes
from app.utils.exceptions import NotFoundError, ValidationError
from app.utils.helpers import pagination_params
from app.websocket_manager import manager

router = APIRouter(prefix="/messages", tags=["messages"])


@router.get("/conversations", response_model=list[dict])
async def get_conversations(
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subquery = (
        select(
            Message.sender_id,
            Message.receiver_id,
            func.max(Message.created_at).label("last_msg_time"),
        )
        .where(
            or_(
                Message.sender_id == current_user.id,
                Message.receiver_id == current_user.id,
            )
        )
        .group_by(Message.sender_id, Message.receiver_id)
        .subquery()
    )

    latest_messages = await db.execute(
        select(Message)
        .where(
            Message.created_at == subquery.c.last_msg_time,
            or_(
                and_(Message.sender_id == subquery.c.sender_id, Message.receiver_id == subquery.c.receiver_id),
                and_(Message.sender_id == subquery.c.receiver_id, Message.receiver_id == subquery.c.sender_id),
            )
        )
        .order_by(Message.created_at.desc())
    )
    conversations = []
    seen = set()

    for msg in latest_messages.scalars().all():
        other_id = msg.receiver_id if msg.sender_id == current_user.id else msg.sender_id
        if other_id in seen:
            continue
        seen.add(other_id)

        other_user = await db.get(User, other_id)
        if not other_user:
            continue

        if search:
            pattern = search.lower()
            if pattern not in (other_user.username or "").lower() and pattern not in (other_user.headline or "").lower():
                continue

        unread_count = await db.execute(
            select(func.count())
            .where(
                Message.sender_id == other_id,
                Message.receiver_id == current_user.id,
                Message.read.is_(False),
            )
        )

        conversations.append({
            "user": UserResponse.model_validate(other_user),
            "last_message": MessageResponse.model_validate(msg),
            "unread": unread_count.scalar(),
        })

    return conversations


@router.get("/conversations/{user_id}", response_model=dict)
async def get_conversation_messages(
    user_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Message).where(
        or_(
            and_(Message.sender_id == current_user.id, Message.receiver_id == user_id),
            and_(Message.sender_id == user_id, Message.receiver_id == current_user.id),
        )
    )

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar()

    offset, limit = pagination_params(page, limit)
    query = query.order_by(Message.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    messages = result.scalars().all()

    await db.execute(
        update(Message).where(
            Message.sender_id == user_id,
            Message.receiver_id == current_user.id,
            Message.read.is_(False),
        ).values(read=True)
    )
    await db.commit()

    return {
        "messages": [MessageResponse.model_validate(m) for m in reversed(messages)],
        "total": total,
    }


@router.post("/send", response_model=MessageResponse, status_code=201)
async def send_message(
    data: MessageSend,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    receiver = await db.get(User, data.receiver_id)
    if not receiver:
        raise NotFoundError("Receiver not found", code=ErrorCodes.NOT_FOUND_RECEIVER)
    if data.receiver_id == current_user.id:
        raise ValidationError("Cannot send message to yourself", code=ErrorCodes.VALIDATION_SELF_MESSAGE)

    msg = Message(
        sender_id=current_user.id,
        receiver_id=data.receiver_id,
        content=data.content,
    )
    db.add(msg)
    await db.flush()
    await db.commit()

    msg_data = MessageResponse.model_validate(msg).model_dump(mode="json")
    event = {
        "type": "NEW_MESSAGE",
        "thread_id": msg.thread_id,
        "message": msg_data,
    }
    asyncio.create_task(manager.broadcast_event(
        current_user.id, data.receiver_id, event
    ))
    asyncio.create_task(manager.publish_to_redis(event))

    asyncio.create_task(
        NotificationService.create(
            db, data.receiver_id, "message",
            f"New message from {current_user.username or 'someone'}",
            data.content[:200],
        )
    )

    return MessageResponse.model_validate(msg)
