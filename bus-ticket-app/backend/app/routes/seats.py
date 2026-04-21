from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from ..database import get_db
from ..models.booking import Booking
from ..schemas.seat import SeatResponse

router = APIRouter(tags=["seats"])

@router.get("/seats/{trip_id}", response_model=List[SeatResponse])
async def get_seats(trip_id: int, db: AsyncSession = Depends(get_db)):
    # Get all bookings for given trip_id
    result = await db.execute(select(Booking).where(Booking.trip_id == trip_id))
    bookings = result.scalars().all()

    # Generate 42 seat numbers as requested (1-14 rows, letters A, B, C)
    seat_numbers = [
        f"{i}{letter}"
        for i in range(1, 15)
        for letter in ["A", "B", "C"]
    ]

    response = []
    for sn in seat_numbers:
        booking = next((b for b in bookings if b.seat_number == sn), None)

        if booking:
            response.append(
                SeatResponse(
                    seat_number=sn,
                    is_reserved=True,
                    status="reserved",
                    trip_id=trip_id,
                    user_id=booking.user_id,
                    gender=booking.gender,
                    first_name=booking.first_name
                )
            )
        else:
            response.append(
                SeatResponse(
                    seat_number=sn,
                    is_reserved=False,
                    status="empty",
                    trip_id=trip_id
                )
            )

    return response
