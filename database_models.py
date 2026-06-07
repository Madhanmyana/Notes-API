from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import String,Integer,Column,DateTime
from datetime import datetime

Base=declarative_base()

class Notes(Base):

    __tablename__="notes"

    id=Column(Integer,primary_key=True,index=True)
    title=Column(String(100))
    content=Column(String(1000))
    created_at=Column(DateTime,default=datetime.now)