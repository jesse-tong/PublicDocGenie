from pydantic import BaseModel

class ChatbotRequest(BaseModel):
    question: str

class ChatbotResponse(BaseModel):
    question: str
    answer: str
    titles: list[str]

class AutofillRequiredInfoResponse(BaseModel):
    answer: str

class AutofillResponse(BaseModel):
    answer: str
    checking_valid_value_text: str
    titles: list[str]