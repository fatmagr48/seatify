from pydantic import BaseModel

class PaymentRequest(BaseModel):
    card_number: str
    card_name: str
    expiry: str
    cvv: str
    amount: float
