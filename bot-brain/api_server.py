from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import json
import os
from bot import extract_symptoms_from_text, get_next_question, diagnose, should_give_diagnosis

app = FastAPI(title="bot-brain AI API")

# Simple in-memory session store for demo
sessions = {}

@app.post("/chat")
async def chat(user_id: str = "default_user", data: dict = Body(...)):
    # Very loose extraction to support different frontend formats
    message = data.get("message")
    if not message:
        facts = data.get("facts")
        if facts:
            if isinstance(facts, list):
                message = ", ".join([str(f) for f in facts])
            else:
                message = str(facts)
        else:
            # Last resort: use the whole body as a string
            message = str(data)

    if user_id not in sessions:
        sessions[user_id] = {
            "symptoms": [],
            "answers": {},
            "conversation_history": [],
            "diagnosis_complete": False,
            "confirmed_disease": None
        }
    
    session = sessions[user_id]
    
    # Process user message
    if message == "START_CONVERSATION":
        # Do not add to symptoms or history for the trigger message
        pass
    else:
        session["conversation_history"].append(f"User: {message}")
        extracted = extract_symptoms_from_text(message)
        if extracted:
            session["symptoms"].extend(extracted)
            session["symptoms"] = list(set(session["symptoms"]))

    # Logic flow
    # Pass control entirely to the backend logic (bot.py / should_give_diagnosis)
    if message != "START_CONVERSATION" and should_give_diagnosis(session["symptoms"], session["answers"], session["conversation_history"]):
        diagnosis = diagnose(session["symptoms"], session["conversation_history"])
        session["diagnosis_complete"] = True
        return {"type": "diagnosis", "content": diagnosis}
    
    # Get the next question (or starting greeting)
    next_q = get_next_question(session["symptoms"], session["conversation_history"])
    session["conversation_history"].append(next_q)
    
    return {"type": "question", "content": next_q}

@app.post("/ask")
async def ask(user_id: str = "default_user", data: dict = Body(...)):
    """Alias for /chat to match frontend expectations"""
    return await chat(user_id, data)

@app.post("/reset")
async def reset(user_id: str):
    if user_id in sessions:
        del sessions[user_id]
    return {"status": "reset"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:19006", "http://localhost:19000", "http://localhost:8081", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'frontend_data')
SYMPTOM_FILE = os.path.join(DATA_DIR, 'symptoms.json')


def load_symptoms():
    if not os.path.exists(SYMPTOM_FILE):
        return []
    with open(SYMPTOM_FILE, 'r', encoding='utf-8') as fh:
        return json.load(fh)


@app.get('/health')
def health():
    return {'status': 'ok'}


@app.get('/symptoms')
def get_symptoms():
    return load_symptoms()


@app.get('/symptoms/{symptom_id}')
def get_symptom(symptom_id: str):
    data = load_symptoms()
    for s in data:
        if str(s.get('id')) == str(symptom_id):
            return s
    raise HTTPException(status_code=404, detail='Symptom not found')


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('api_server:app', host='127.0.0.1', port=8000, reload=True)
