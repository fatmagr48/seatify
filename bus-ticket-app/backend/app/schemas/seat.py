from pydantic import BaseModel
from typing import Optional

class SeatResponse(BaseModel):
    id: Optional[int] = None # No longer mapping to a DB id
    seat_number: str
    is_reserved: bool
    status: str # "reserved" or "empty"
    trip_id: int
    user_id: Optional[int] = None
    gender: Optional[str] = None
    first_name: Optional[str] = None # Added for requested response format

    class Config:
        from_attributes = True
