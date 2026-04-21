import json
import os
import asyncio
from aiokafka import AIOKafkaProducer, AIOKafkaConsumer

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "kafka:9092")
KAFKA_TOPIC = "bookings"

class BookingProducer:
    def __init__(self):
        self.producer = None

    async def start(self):
        self.producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BROKER)
        await self.producer.start()

    async def stop(self):
        if self.producer:
            await self.producer.stop()

    async def send_booking_event(self, event_data: dict):
        if not self.producer:
            await self.start()
        
        try:
            value = json.dumps(event_data).encode("utf-8")
            await self.producer.send_and_wait(KAFKA_TOPIC, value)
            print(f"INFO:  Kafka Producer sent event: {event_data['event']}")
        except Exception as e:
            print(f"ERROR: Kafka Producer failed: {e}")

class BookingConsumer:
    def __init__(self, websocket_manager):
        self.consumer = None
        self.manager = websocket_manager

    async def start(self):
        self.consumer = AIOKafkaConsumer(
            KAFKA_TOPIC,
            bootstrap_servers=KAFKA_BROKER,
            group_id="admin_logs_group",
            auto_offset_reset='earliest'
        )
        await self.consumer.start()
        asyncio.create_task(self.consume())

    async def consume(self):
        try:
            async for msg in self.consumer:
                event = json.loads(msg.value.decode("utf-8"))
                # Log event: "Ahmet booked seat 1A"
                log_text = f"{event['name']} booked seat {event['seat']}"
                print(f"INFO:  Kafka Consumer received: {log_text}")
                
                # Push to Admin WebSocket through the manager
                await self.manager.broadcast_admin_log({
                    "event": event["event"],
                    "message": log_text,
                    "trip": event["trip"],
                    "seat": event["seat"],
                    "timestamp": event.get("time") # Already formatted or raw
                })
        except Exception as e:
            print(f"ERROR: Kafka Consumer loop error: {e}")
        finally:
            await self.consumer.stop()

booking_producer = BookingProducer()
