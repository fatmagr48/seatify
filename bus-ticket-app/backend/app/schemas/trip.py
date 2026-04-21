from pydantic import BaseModel
from datetime import datetime

class TripCreate(BaseModel):
    origin: str
    destination: str
    date: datetime

class TripResponse(BaseModel):
    id: int
    origin: str
    destination: str
    date: datetime

    class Config:
        from_attributes = True
