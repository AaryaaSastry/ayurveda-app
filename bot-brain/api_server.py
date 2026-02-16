from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
import os

app = FastAPI(title="bot-brain API")

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
