from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

database_url="mysql+pymysql://root:password@localhost:3306/Notes"
engine=create_engine(database_url)
session=sessionmaker(autocommit=False,autoflush=False,bind=engine)