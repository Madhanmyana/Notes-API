from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
import os

database_url=os.getenv("DATABASE_URL")
engine=create_engine(database_url)
session=sessionmaker(autocommit=False,autoflush=False,bind=engine)