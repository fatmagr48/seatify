from fastapi import APIRouter, HTTPException, Depends
from ..schemas.payment import PaymentRequest
from ..services.deps import get_current_user

router = APIRouter(prefix="/payment", tags=["payments"])

@router.post("")
async def process_payment(payment_in: PaymentRequest, current_user = Depends(get_current_user)):
    # 1. Validate Card Number (Exactly 16 digits)
    card_clean = payment_in.card_number.replace(' ', '')
    if not card_clean.isdigit() or len(card_clean) != 16:
        raise HTTPException(status_code=400, detail="Card number must be 16 digits")
    
    # 2. Validate CVV (Exactly 3 digits)
    if not payment_in.cvv.isdigit() or len(payment_in.cvv) != 3:
        raise HTTPException(status_code=400, detail="CVV must be 3 digits")
        
    # 3. Validate Expiry (MM/YY)
    import re
    if not re.match(r"^(0[1-9]|1[0-2])\/\d{2}$", payment_in.expiry):
        raise HTTPException(status_code=400, detail="Expiry must be in MM/YY format")
    
    # Simulate success
    return {"status": "success", "message": "Payment successful"}
