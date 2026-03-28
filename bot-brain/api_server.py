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
    diagnosis_context = data.get("diagnosis")
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
            "confirmed_disease": None,
            "diagnosis_text": None
        }
    
    session = sessions[user_id]

    if diagnosis_context and not session.get("diagnosis_complete"):
        session["diagnosis_complete"] = True
        session["diagnosis_text"] = diagnosis_context
        if diagnosis_context not in session["conversation_history"]:
            session["conversation_history"].append(diagnosis_context)
    
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

    # Once a report has been generated, treat later messages as follow-up questions
    # about that report instead of attempting to diagnose again.
    if message != "START_CONVERSATION" and session.get("diagnosis_complete"):
        next_q = get_next_question(session["symptoms"], session["conversation_history"])
        session["conversation_history"].append(next_q)
        return {
            "type": "question",
            "content": next_q,
            "intelligence": {
                "symptoms": session["symptoms"],
                "prakriti": session.get("prakriti", "Evaluating..."),
                "progress": 100
            }
        }

    # Logic flow
    # Pass control entirely to the backend logic (bot.py / should_give_diagnosis)
    if message != "START_CONVERSATION" and should_give_diagnosis(session["symptoms"], session["answers"], session["conversation_history"]):
        diagnosis = diagnose(session["symptoms"], session["conversation_history"])
        session["diagnosis_complete"] = True
        session["diagnosis_text"] = diagnosis
        session["conversation_history"].append(diagnosis)
        return {"type": "diagnosis", "content": diagnosis}
    
    # Get the next question (or starting greeting)
    next_q = get_next_question(session["symptoms"], session["conversation_history"])
    session["conversation_history"].append(next_q)
    
    return {
        "type": "question", 
        "content": next_q,
        "intelligence": {
            "symptoms": session["symptoms"],
            "prakriti": session.get("prakriti", "Evaluating..."),
            "progress": len(session["symptoms"]) * 20
        }
    }

@app.post("/ask")
async def ask(user_id: str = "default_user", data: dict = Body(...)):
    """Alias for /chat to match frontend expectations"""
    return await chat(user_id, data)


@app.post("/recipes")
async def recipes(user_id: str = "default_user", data: dict = Body(...)):
    """
    Generate personalized Ayurvedic recipes based on diagnosis and patient facts.
    
    Expected payload:
    {
        "facts": ["symptom1", "symptom2", ...],  # or string
        "diagnosis": "diagnosis text or JSON",
        "patientInfo": { "age": "...", "gender": "..." }  # optional
    }
    """
    facts = data.get("facts", [])
    diagnosis = data.get("diagnosis", "")
    patient_info = data.get("patientInfo", {})
    
    # Get session for additional context
    session = sessions.get(user_id, {})
    symptoms = session.get("symptoms", [])
    
    # Build context for recipe generation
    context_parts = []
    
    if facts:
        if isinstance(facts, list):
            context_parts.append(f"Patient symptoms: {', '.join(facts)}")
        else:
            context_parts.append(f"Patient symptoms: {facts}")
    
    if symptoms:
        context_parts.append(f"Extracted symptoms: {', '.join(symptoms)}")
    
    if diagnosis:
        # Try to extract diagnosis name if it's JSON
        try:
            if "---REPORT_DATA---" in diagnosis:
                parts = diagnosis.split("---REPORT_DATA---")
                diagnosis_json = parts[-1] if len(parts) > 1 else diagnosis
                diag_obj = json.loads(diagnosis_json)
                diag_name = diag_obj.get("diagnosis", {}).get("name", diagnosis)
                context_parts.append(f"Diagnosis: {diag_name}")
                
                # Add dietary info from diagnosis
                dietary = diag_obj.get("dietaryGuide", {})
                if dietary.get("toConsume"):
                    context_parts.append(f"Recommended foods: {', '.join(dietary['toConsume'][:5])}")
                if dietary.get("toAvoid"):
                    context_parts.append(f"Foods to avoid: {', '.join(dietary['toAvoid'][:5])}")
            else:
                context_parts.append(f"Diagnosis: {diagnosis[:200]}")
        except:
            context_parts.append(f"Diagnosis: {diagnosis[:200]}")
    
    if patient_info:
        context_parts.append(f"Patient info: {patient_info}")
    
    context = "\n".join(context_parts)
    
    # Use Gemini to generate recipes
    from gemini_client import send
    
    prompt = (
        f"You are an Ayurvedic culinary expert. Generate personalized recipes based on the following information:\n\n"
        f"{context}\n\n"
        "Generate 3-4 detailed recipes in the following format. Each recipe should include:\n"
        "- Name of the dish/recipe\n"
        "- Benefits (how it helps balance the doshas/condition)\n"
        "- Ingredients (list all items)\n"
        "- Preparation steps (clear, numbered instructions)\n"
        "- When to consume (morning/evening/before meal/after meal)\n"
        "- Any precautions\n\n"
        "Format the output with '---RECIPE---' separator between recipes.\n"
        "Use simple, clear language that anyone can follow.\n"
        "Include traditional Ayurvedic recipes when appropriate."
    )
    
    try:
        recipes_text = send(prompt)
        return {"recipes": recipes_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate recipes: {str(e)}")

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
