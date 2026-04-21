from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from ..database import Base
from datetime import datetime

class Trip(Base):
    __tablename__ = "trips"
    id = Column(Integer, primary_key=True, index=True)
    origin = Column(String, index=True, nullable=False)
    destination = Column(String, index=True, nullable=False)
    date = Column(DateTime, nullable=False, default=datetime.utcnow)
    bookings = relationship("Booking", back_populates="trip")
