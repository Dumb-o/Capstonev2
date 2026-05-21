from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import User, Message
from app.schemas.schemas import MessageSend, MessageResponse, Conversation, UserResponse
from app.utils.exceptions import NotFoundError, ValidationError
from app.utils.helpers import pagination_params

router = APIRouter(prefix="/messages", tags=["messages"])


@router.get("/conversations", response_model=list[dict])
async def get_conversations(
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

        unread_count = await db.execute(
            select(func.count())
            .where(
                Message.sender_id == other_id,
                Message.receiver_id == current_user.id,
                Message.read == False,
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
        select(Message).where(
            Message.sender_id == user_id,
            Message.receiver_id == current_user.id,
            Message.read == False,
        )
    )

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
        raise NotFoundError("Receiver not found")
    if data.receiver_id == current_user.id:
        raise ValidationError("Cannot send message to yourself")

    msg = Message(
        sender_id=current_user.id,
        receiver_id=data.receiver_id,
        content=data.content,
    )
    db.add(msg)
    await db.flush()
    return MessageResponse.model_validate(msg)
