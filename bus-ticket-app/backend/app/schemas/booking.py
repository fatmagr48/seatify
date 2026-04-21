from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from ..utils import validate_tc

class BookingBase(BaseModel):
    trip_id: int
    seat_number: str
    first_name: str
    last_name: str
    gender: str
    age: int
    phone: str
    identity_number: str

    @field_validator('gender')
    @classmethod
    def validate_gender(cls, v):
        if v.lower() not in ['male', 'female']:
            raise ValueError("Gender must be 'male' or 'female'")
        return v.lower()

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if not v.isdigit():
            raise ValueError("Phone number must contain only digits")
        if not (10 <= len(v) <= 11):
            raise ValueError("Phone number must be between 10 and 11 digits long")
        return v

class BookingCreate(BookingBase):
    pass

class BookingResponse(BookingBase):
    id: int
    user_id: int
    trip_origin: Optional[str] = None
    trip_destination: Optional[str] = None
    trip_date: Optional[datetime] = None # Added for departure time

    class Config:
        from_attributes = True

class BookingAdminResponse(BookingResponse):
    pass

class AdminBookingExtendedResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    seat_number: str
    gender: str
    phone: str
    identity: str
    origin: str
    destination: str
    departure_time: str

    class Config:
        from_attributes = True
