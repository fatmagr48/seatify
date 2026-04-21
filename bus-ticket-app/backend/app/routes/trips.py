from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, cast, Date, func
from typing import List, Optional
from ..database import get_db
from ..models.trip import Trip
from ..schemas.trip import TripCreate, TripResponse
from ..services.deps import get_current_admin

router = APIRouter(prefix="/trips", tags=["trips"])

@router.get("", response_model=List[TripResponse])
async def get_trips(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Trip))
    return result.scalars().all()

@router.get("/search", response_model=List[TripResponse])
async def search_trips(
    origin: Optional[str] = None, 
    destination: Optional[str] = None, 
    date: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Trip)
    filters = []
    
    if origin:
        filters.append(Trip.origin == origin)
    if destination:
        filters.append(Trip.destination == destination)
    if date:
        try:
            from datetime import datetime
            date_obj = datetime.strptime(date, '%Y-%m-%d').date()
            # Match only the date part, ignoring time
            filters.append(func.date(Trip.date) == date_obj)
        except ValueError:
            pass # Invalid date format, skip or handle accordingly
        
    if filters:
        query = query.where(and_(*filters))
        
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=TripResponse)
async def create_trip(trip_in: TripCreate, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_admin)):
    new_trip = Trip(origin=trip_in.origin, destination=trip_in.destination, date=trip_in.date.replace(tzinfo=None))
    db.add(new_trip)
    await db.commit()
    await db.refresh(new_trip)
    
    return new_trip
