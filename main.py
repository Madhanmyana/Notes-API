from fastapi import FastAPI,Depends,HTTPException
from models import Notes
import database_models
from database import session,engine
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"])

database_models.Base.metadata.create_all(bind=engine)

# notes=[Notes(id=0,title="DSA",content="Solved 3 DSA problems today",created_at="2026-05-29T09:39:59.885Z")]

def get_db():

    db=session()

    try:
        yield db

    finally:
        db.close()

@app.get("/")
def home():
    return "notes api is running"

@app.post("/notes/")
def create_note(note:Notes,db:Session=Depends(get_db)):
    db.add(database_models.Notes(**note.model_dump()))
    db.commit()
    return "note created sucessfully"

@app.get("/notes/")
def get_all_notes(db:Session=Depends(get_db)):
    db_notes=db.query(database_models.Notes).all()
    return db_notes

@app.get("/notes/{id}")
def get_note_by_id(id:int,db:Session=Depends(get_db)):
    db_note=db.query(database_models.Notes).filter(database_models.Notes.id==id).first()
    if db_note:
        return db_note
    else:
        return "note not found"

@app.put("/notes/{id}")
def edit_note_by_id(id:int,note:Notes,db:Session=Depends(get_db)):
    db_note=db.query(database_models.Notes).filter(database_models.Notes.id==id).first()
    if db_note:
        db_note.title=note.title
        db_note.content=note.content
        db.commit()
        return 'update successful'
    return "not not found"

@app.delete("/notes/{id}")
def get_note_by_id(id:int,db:session=Depends(get_db)):
    db_note=db.query(database_models.Notes).filter(database_models.Notes.id==id).first()
    if db_note:
        db.delete(db_note)
        db.commit()
        return "note deleted"
    raise HTTPException(
    status_code=404,
    detail="Note not found")