import asyncio
import random
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..database import AsyncSessionLocal
from ..models.trip import Trip
from ..models.user import User
from ..models.booking import Booking
from ..websocket.manager import manager

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

async def simulation_worker():
    while True:
        await asyncio.sleep(random.randint(10, 20)) # Slow down simulation a bit
        try:
            async with AsyncSessionLocal() as db:
                # 1. Get a random active trip
                result = await db.execute(select(Trip).order_by(Trip.id.desc()).limit(10))
                trips = result.scalars().all()
                if not trips:
                    continue
                trip = random.choice(trips)
                
                # 2. Get all bookings for this trip to calculate occupancy
                result = await db.execute(select(Booking).where(Booking.trip_id == trip.id))
                trip_bookings = result.scalars().all()
                booked_numbers = {b.seat_number for b in trip_bookings}
                
                # If trip is too full, skip
                if len(booked_numbers) >= 35:
                    continue
                
                # 3. Generate all 40 seat numbers and find empty ones
                all_seat_numbers = generate_seat_numbers(40)
                empty_seat_numbers = [sn for sn in all_seat_numbers if sn not in booked_numbers]
                
                if not empty_seat_numbers:
                    continue
                
                # 4. Get the admin user for simulation booking
                result = await db.execute(select(User).where(User.email == "admin@admin.com"))
                admin_user = result.scalars().first()
                if not admin_user:
                    continue
                
                # 5. Book the seat with gender rule enforcement
                gender = random.choice(["male", "female"])
                valid_seat = None
                random.shuffle(empty_seat_numbers)
                
                for sn in empty_seat_numbers:
                    neighbor_sn = None
                    if sn.endswith('A'): neighbor_sn = sn.replace('A', 'B')
                    elif sn.endswith('B'): neighbor_sn = sn.replace('B', 'A')
                    
                    if neighbor_sn:
                        # Check if neighbor is booked with different gender
                        neighbor_booking = next((b for b in trip_bookings if b.seat_number == neighbor_sn), None)
                        if neighbor_booking and neighbor_booking.gender != gender:
                            continue # Skip this seat for this gender
                    
                    valid_seat = sn
                    break
                
                if not valid_seat:
                    continue # No valid seat for this gender in this trip
                
                new_booking = Booking(
                    user_id=admin_user.id,
                    trip_id=trip.id,
                    seat_number=valid_seat,
                    first_name=f"Sim_{valid_seat}",
                    last_name="Passenger",
                    gender=gender,
                    age=random.randint(18, 70),
                    phone=f"0500{random.randint(1000000, 9999999)}",
                    identity_number=f"{random.randint(10000000000, 99999999999)}"
                )
                db.add(new_booking)
                await db.commit()
                
                # 6. Broadcast update via WebSocket
                await manager.broadcast_trip_update(trip.id, {
                    "type": "seat_update",
                    "seat_number": valid_seat,
                    "status": "reserved",
                    "user_id": admin_user.id,
                    "gender": gender,
                    "first_name": new_booking.first_name
                })
                print(f"INFO: [Simulation] Booked seat {valid_seat} for trip {trip.id}")
                
        except Exception as e:
            # Silently catch constraint errors (like race conditions in simulation)
            if "UniqueConstraint" not in str(e):
                print(f"ERROR: [Simulation Task] {e}")
