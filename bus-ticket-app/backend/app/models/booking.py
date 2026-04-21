from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from ..database import Base

class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    seat_number = Column(String, nullable=False) # e.g. "1A", "1B", "1C"
    
    # Passenger info
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    gender = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    phone = Column(String, nullable=False)
    identity_number = Column(String, nullable=False)

    user = relationship("User", back_populates="bookings")
    trip = relationship("Trip", back_populates="bookings")

    # Constraint to prevent double booking of same seat on same trip
    __table_args__ = (
        UniqueConstraint('trip_id', 'seat_number', name='_trip_seat_uc'),
    )
