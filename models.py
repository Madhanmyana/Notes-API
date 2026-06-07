from pydantic import BaseModel,Field
from typing import Optional
from datetime import datetime

class Notes(BaseModel):
    id:Optional[int]=None
    title:str=Field(...,min_length=3)
    content:str=Field(...,min_length=10)
    created_at:datetime=Field(default_factory=datetime.now)