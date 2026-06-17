import asyncio
import json
import logging

from fastapi import WebSocket

logger = logging.getLogger("freeledger.websocket")


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, ws: WebSocket, user_id: str):
        await ws.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(ws)
        logger.info("WebSocket connected: user=%s", user_id)

    def disconnect(self, ws: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id] = [
                w for w in self.active_connections[user_id] if w is not ws
            ]
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_to_user(self, user_id: str, event: dict):
        if user_id not in self.active_connections:
            return
        dead = []
        for ws in self.active_connections[user_id]:
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, user_id)

    async def broadcast_event(self, sender_id: str, receiver_id: str, event: dict):
        await asyncio.gather(
            self.send_to_user(sender_id, event),
            self.send_to_user(receiver_id, event),
        )

    async def publish_to_redis(self, event: dict):
        try:
            from app.redis_client import get_redis
            r = await get_redis()
            if r:
                await r.publish("messaging:events", json.dumps(event))
        except Exception:
            pass


manager = ConnectionManager()
