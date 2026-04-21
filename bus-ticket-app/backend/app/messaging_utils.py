import json
import os
import asyncio
import redis.asyncio as redis

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
RELIABLE_TOPIC = "bookings_channel"

class MessagingProducer:
    def __init__(self):
        self.redis = None

    async def start(self):
        self.redis = await redis.from_url(REDIS_URL, decode_responses=True)
        print("INFO:  Messaging Producer (Redis) started.")

    async def stop(self):
        if self.redis:
            await self.redis.close()

    async def send_booking_event(self, event_data: dict):
        if not self.redis:
            await self.start()
        
        try:
            # Redis Pub/Sub: Publish message to channel
            message = json.dumps(event_data)
            await self.redis.publish(RELIABLE_TOPIC, message)
            print(f"INFO:  Messaging Producer (Redis) published: {event_data['event']}")
        except Exception as e:
            print(f"ERROR: Messaging Producer failed: {e}")

class MessagingConsumer:
    def __init__(self, websocket_manager):
        self.redis = None
        self.manager = websocket_manager
        self.pubsub = None

    async def start(self):
        self.redis = await redis.from_url(REDIS_URL, decode_responses=True)
        self.pubsub = self.redis.pubsub()
        await self.pubsub.subscribe(RELIABLE_TOPIC)
        print(f"INFO:  Messaging Consumer (Redis) subscribed to {RELIABLE_TOPIC}")
        asyncio.create_task(self.consume())

    async def consume(self):
        try:
            async for message in self.pubsub.listen():
                if message["type"] == "message":
                    event = json.loads(message["data"])
                    
                    # Log event logic (same as before)
                    log_text = f"{event['name']} booked seat {event['seat']}"
                    print(f"INFO:  Messaging Consumer (Redis) received: {log_text}")
                    
                    # Push to Admin WebSocket through the manager
                    await self.manager.broadcast_admin_log({
                        "event": event["event"],
                        "message": log_text,
                        "trip": event["trip"],
                        "seat": event["seat"],
                        "timestamp": event.get("time")
                    })
        except Exception as e:
            print(f"ERROR: Messaging Consumer loop error: {e}")
        finally:
            if self.pubsub:
                await self.pubsub.unsubscribe(RELIABLE_TOPIC)
            if self.redis:
                await self.redis.close()

messaging_producer = MessagingProducer()
