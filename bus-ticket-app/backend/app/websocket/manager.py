import redis.asyncio as redis
import json
from fastapi import WebSocket
import os
import asyncio

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}
        self.redis = redis.from_url(REDIS_URL)

    async def connect(self, websocket: WebSocket, trip_id: int):
        await websocket.accept()
        if trip_id not in self.active_connections:
            self.active_connections[trip_id] = []
        self.active_connections[trip_id].append(websocket)

    def disconnect(self, websocket: WebSocket, trip_id: int):
        if trip_id in self.active_connections:
            if websocket in self.active_connections[trip_id]:
                self.active_connections[trip_id].remove(websocket)
            if not self.active_connections[trip_id]:
                del self.active_connections[trip_id]
        
        # Also check admin connections
        if "admin" in self.active_connections:
            if websocket in self.active_connections["admin"]:
                self.active_connections["admin"].remove(websocket)

    async def broadcast_trip_update(self, trip_id: int, message: dict):
        # Publish to Redis
        await self.redis.publish(f"trip_updates_{trip_id}", json.dumps(message))

    async def broadcast_admin_log(self, message: dict):
        # Publish to a special Redis channel for admins
        await self.redis.publish("admin_logs", json.dumps(message))

    async def _redis_listener(self):
        pubsub = self.redis.pubsub()
        await pubsub.psubscribe("trip_updates_*")
        await pubsub.subscribe("admin_logs")
        async for message in pubsub.listen():
            if message["type"] in ["pmessage", "message"]:
                data = message["data"].decode("utf-8")
                
                if message["channel"].decode("utf-8") == "admin_logs":
                    # Broadcast to all admin connections
                    if "admin" in self.active_connections:
                        for connection in list(self.active_connections["admin"]):
                            try:
                                await connection.send_text(data)
                            except Exception:
                                self.disconnect(connection, 0)
                    continue

                # Handle trip updates
                channel = message["channel"].decode("utf-8")
                trip_id_str = channel.split("_")[-1]
                try:
                    trip_id = int(trip_id_str)
                    data = message["data"].decode("utf-8")
                    if trip_id in self.active_connections:
                        # Need to copy list to avoid runtime error if disconnected while iterating
                        for connection in list(self.active_connections[trip_id]):
                            try:
                                await connection.send_text(data)
                            except Exception:
                                self.disconnect(connection, trip_id)
                except ValueError:
                    pass

    def start_listener(self):
        asyncio.create_task(self._redis_listener())

manager = ConnectionManager()
