import asyncio
from app.database import engine
from sqlalchemy import text

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT count(*) FROM trips"))
        print(f"Trips count: {res.scalar()}")
        res = await conn.execute(text("SELECT count(*) FROM bookings"))
        print(f"Bookings count: {res.scalar()}")

if __name__ == "__main__":
    asyncio.run(main())
