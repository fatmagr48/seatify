from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from contextlib import asynccontextmanager
from sqlalchemy.future import select

from .database import engine, Base, wait_for_db, AsyncSessionLocal
from .routes import auth, trips, seats, bookings, admin, ws, payments
from .websocket.manager import manager
from .simulation.task import simulation_worker
from datetime import datetime, timedelta
from .models.user import User
from .models.trip import Trip
from .services.auth_service import get_password_hash
from .messaging_utils import messaging_producer, MessagingConsumer

app = FastAPI(title="Bus Ticket Simulation System")

@app.on_event("startup")
async def startup_event():
    await wait_for_db()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Ensure Admin User exists with correct credentials
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "admin@admin.com"))
        admin_user = result.scalars().first()
        
        target_password = "admin"
        
        if not admin_user:
            admin_user = User(
                email="admin@admin.com",
                password_hash=get_password_hash(target_password),
                is_admin=True
            )
            db.add(admin_user)
            await db.commit()
            print(f"INFO:  Admin user created: admin@admin.com / {target_password}")
        else:
            # Ensure the password is correct (handles transition from old hashing/passwords)
            from .services.auth_service import verify_password
            if not verify_password(target_password, admin_user.password_hash) or not admin_user.is_admin:
                admin_user.password_hash = get_password_hash(target_password)
                admin_user.is_admin = True
                await db.commit()
                print(f"INFO:  Admin user credentials updated: admin@admin.com / {target_password}")
            else:
                print("INFO:  Admin user verified: admin@admin.com")

        # Auto-Seed Trips if empty
        result = await db.execute(select(Trip))
        if not result.scalars().first():
            print("INFO:  Database empty. Auto-seeding trips...")
            today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            target_trips = [
                ("Istanbul", "Ankara", 0, 8), ("Istanbul", "Ankara", 0, 18),
                ("Ankara", "Izmir", 0, 12), ("Izmir", "Istanbul", 0, 20),
                ("Istanbul", "Ankara", 1, 8), ("Istanbul", "Ankara", 1, 18),
                ("Ankara", "Izmir", 1, 12), ("Izmir", "Istanbul", 1, 20),
            ]
            for origin, dest, offset, hour in target_trips:
                trip_date = (today + timedelta(days=offset)).replace(hour=hour)
                db.add(Trip(origin=origin, destination=dest, date=trip_date))
            await db.commit()
            print(f"INFO:  Successfully seeded {len(target_trips)} trips.")

    # Graceful initialization of simulation and Messaging
    try:
        asyncio.create_task(simulation_worker())
        manager.start_listener()
        
        # Messaging initialization (Redis)
        await messaging_producer.start()
        consumer = MessagingConsumer(manager)
        await consumer.start()
        print("INFO:  Messaging services (Redis) started successfully.")
    except Exception as e:
        print(f"WARNING:  Failed to start Messaging or Simulation services: {e}")
        print("INFO:  Application will continue running without Messaging/Simulation.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(trips.router)
app.include_router(seats.router)
app.include_router(bookings.router)
app.include_router(admin.router)
app.include_router(ws.router)
app.include_router(payments.router)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Backend is running"}
