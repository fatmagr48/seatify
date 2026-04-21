from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from typing import List
from ..database import get_db
from ..models.booking import Booking
from ..schemas.booking import BookingAdminResponse, AdminBookingExtendedResponse
from ..services.deps import get_current_admin
from ..websocket.manager import manager

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/bookings", response_model=List[AdminBookingExtendedResponse])
async def get_all_bookings(db: AsyncSession = Depends(get_db), current_user = Depends(get_current_admin)):
    result = await db.execute(
        select(Booking).options(
            joinedload(Booking.trip)
        ).order_by(Booking.id.desc())
    )
    bookings = result.scalars().all()
    
    response = []
    for b in bookings:
        # Map fields to match the requested format
        resp_obj = {
            "id": b.id,
            "first_name": b.first_name + " " + b.last_name,
            "last_name": "", # Combined into first_name for the user's specific Ahmet example
            "seat_number": b.seat_number,
            "gender": b.gender,
            "phone": b.phone,
            "identity": b.identity_number,
            "origin": b.trip.origin if b.trip else "N/A",
            "destination": b.trip.destination if b.trip else "N/A",
            "departure_time": b.trip.date.strftime("%H:%M") if b.trip else "N/A"
        }
        response.append(resp_obj)
        
    return response

@router.post("/trips/{trip_id}/reset")
async def reset_seats(trip_id: int, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_admin)):
    # Simply delete all bookings for the trip
    await db.execute(Booking.__table__.delete().where(Booking.trip_id == trip_id))
    await db.commit()
    
    # Broadcast reset
    await manager.broadcast_trip_update(trip_id, {
        "type": "trip_reset",
        "trip_id": trip_id
    })
    
    return {"message": "Seats reset successfully"}
