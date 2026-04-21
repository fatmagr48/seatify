import asyncio
import os
import random
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.database import Base, DATABASE_URL, wait_for_db
from app.models.user import User
from app.models.trip import Trip
from app.models.booking import Booking
from app.services.auth_service import get_password_hash
from datetime import datetime, timedelta
from sqlalchemy import text

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

MALE_NAMES = ["Ahmet", "Mehmet", "Mustafa", "Ali", "Can", "Emre", "Burak", "Hakan", "Yusuf", "Ömer"]
FEMALE_NAMES = ["Ayşe", "Fatma", "Zeynep", "Elif", "Merve", "Selin", "Aslı", "Gizem", "Ece", "Büşra"]
LAST_NAMES = ["Yılmaz", "Kaya", "Demir", "Çelik", "Şahin", "Öztürk", "Arslan", "Doğan", "Kılıç", "Güneş"]

def generate_seat_numbers(total=40):
    seats = []
    row = 1
    letters = ['A', 'B', 'C']
    while len(seats) < total:
        for letter in letters:
            if len(seats) < total:
                seats.append(f"{row}{letter}")
        row += 1
    return seats

async def seed_data():
    await wait_for_db()
    
    async with engine.begin() as conn:
        print("Clearing and updating schema...")
        await conn.execute(text("DROP TABLE IF EXISTS bookings CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS seats CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS trips CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS users CASCADE;"))
        await conn.run_sync(Base.metadata.create_all)
        
    async with AsyncSessionLocal() as db:
        print("Seeding users and trips...")
        admin_user = User(email="admin@admin.com", password_hash=get_password_hash("admin"), is_admin=True)
        db.add(admin_user)
        await db.commit()
        await db.refresh(admin_user)

        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        trip_data = [
            ("Istanbul",  "Ankara",   0,  8),
            ("Istanbul",  "Ankara",   0, 18),
            ("Ankara",    "Izmir",    0, 12),
            ("Izmir",     "Istanbul", 0, 20),
            ("Istanbul",  "Ankara",   1,  8),
            ("Istanbul",  "Ankara",   1, 18),
            ("Ankara",    "Izmir",    1, 12),
            ("Izmir",     "Istanbul", 1, 20),
        ]

        seat_numbers = generate_seat_numbers(40)

        for origin, destination, day_offset, hour in trip_data:
            trip_date = (today + timedelta(days=day_offset)).replace(hour=hour, minute=0, second=0)
            trip = Trip(origin=origin, destination=destination, date=trip_date)
            db.add(trip)
            await db.flush()

            target_count = random.randint(5, 12)
            occupied_sns = random.sample(seat_numbers, target_count)
            
            seat_gender_map = {}

            # Sort occupied seats to handle adjacency correctly if needed, 
            # though random sample is fine if we check neighbors.
            for sn in occupied_sns:
                # 2+1 Adjacency for seeding
                neighbor_sn = None
                if sn.endswith('A'): neighbor_sn = sn.replace('A', 'B')
                elif sn.endswith('B'): neighbor_sn = sn.replace('B', 'A')
                
                gender = None
                if neighbor_sn and neighbor_sn in seat_gender_map:
                    gender = seat_gender_map[neighbor_sn]
                else:
                    gender = random.choice(["male", "female"])
                
                seat_gender_map[sn] = gender
                
                first_name = random.choice(MALE_NAMES if gender == "male" else FEMALE_NAMES)
                last_name = random.choice(LAST_NAMES)
                
                booking = Booking(
                    user_id=admin_user.id,
                    trip_id=trip.id,
                    seat_number=sn,
                    first_name=first_name,
                    last_name=last_name,
                    gender=gender,
                    age=random.randint(18, 70),
                    phone=f"05{random.randint(30, 59)}{random.randint(1000000, 9999999)}",
                    identity_number=f"{random.randint(10000000000, 99999999999)}"
                )
                db.add(booking)
            
        await db.commit()
        print(f"Seed completed: 10 trips with realistic bookings (Source of Truth: Bookings).")

if __name__ == "__main__":
    asyncio.run(seed_data())
