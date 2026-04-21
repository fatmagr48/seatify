from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from ..database import get_db
from ..models.booking import Booking
from ..schemas.booking import BookingCreate, BookingResponse
from ..services.deps import get_current_user
from ..utils import validate_tc
from ..kafka_utils import booking_producer
from ..models.trip import Trip
from ..websocket.manager import manager
from datetime import datetime

router = APIRouter(prefix="/book", tags=["bookings"])

@router.post("", response_model=BookingResponse)
async def book_seat(booking_in: BookingCreate, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    # 0. Validate Turkish ID (TC No)
    if not current_user.is_admin and not validate_tc(booking_in.identity_number):
        raise HTTPException(status_code=400, detail="Invalid Turkish ID number")

    # 1. Check if the seat is already booked
    existing_res = await db.execute(
        select(Booking).where(
            Booking.trip_id == booking_in.trip_id, 
            Booking.seat_number == booking_in.seat_number
        )
    )
    if existing_res.scalars().first():
        raise HTTPException(status_code=400, detail="Seat already reserved")

    # 2. Occupancy limit: Only admin can book more than 38 seats
    if not current_user.is_admin:
        occ_res = await db.execute(
            select(func.count(Booking.id)).where(Booking.trip_id == booking_in.trip_id)
        )
        occupied_count = occ_res.scalar() or 0
        if occupied_count >= 38:
            raise HTTPException(
                status_code=400,
                detail="This trip has reached its booking limit for normal users. Please contact administration."
            )

    # 3. 2+1 Gender adjacency rules (Dynamic string-based)
    sn = booking_in.seat_number
    neighbor_sn = None
    if sn.endswith('A'):
        neighbor_sn = sn.replace('A', 'B')
    elif sn.endswith('B'):
        neighbor_sn = sn.replace('B', 'A')
    # Seats ending in 'C' are singles
    
    if neighbor_sn and not current_user.is_admin:
        neigh_res = await db.execute(
            select(Booking).where(
                Booking.trip_id == booking_in.trip_id, 
                Booking.seat_number == neighbor_sn
            )
        )
        neighbor_booking = neigh_res.scalars().first()
        if neighbor_booking and neighbor_booking.gender != booking_in.gender:
            raise HTTPException(
                status_code=400, 
                detail="Cannot select this seat due to gender rules"
            )

    # 4. Create new booking
    new_booking = Booking(
        user_id=current_user.id,
        trip_id=booking_in.trip_id,
        seat_number=booking_in.seat_number,
        first_name=booking_in.first_name,
        last_name=booking_in.last_name,
        gender=booking_in.gender,
        age=booking_in.age,
        phone=booking_in.phone,
        identity_number=booking_in.identity_number
    )
    db.add(new_booking)
    await db.commit()
    await db.refresh(new_booking)

    # 5. Broadcast to WebSocket
    await manager.broadcast_trip_update(booking_in.trip_id, {
        "type": "seat_update",
        "seat_number": booking_in.seat_number,
        "status": "reserved",
        "user_id": current_user.id,
        "gender": booking_in.gender,
        "first_name": booking_in.first_name
    })

    # 6. Send Kafka Event
    try:
        trip_res = await db.execute(select(Trip).where(Trip.id == booking_in.trip_id))
        trip = trip_res.scalars().first()
        if trip:
            await booking_producer.send_booking_event({
                "event": "booking_created",
                "name": booking_in.first_name,
                "seat": booking_in.seat_number,
                "trip": f"{trip.origin}-{trip.destination}",
                "time": datetime.now().strftime("%H:%M")
            })
    except Exception as e:
        print(f"ERROR: Failed to send Kafka event: {e}")
    
    return new_booking
