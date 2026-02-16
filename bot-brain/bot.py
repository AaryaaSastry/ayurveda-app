# import google.generativeai as genai
from google import genai
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Get API key from environment variable
api_key = os.getenv("GEMINI_API_KEY")

# The client gets the API key from the environment variable `GEMINI_API_KEY`.
client = genai.Client(api_key=api_key)

# Session state
session = {
    "symptoms": [],
    "answers": {},
    "conversation_history": [],
    "diagnosis_complete": False,
    "confirmed_disease": None,
    "reasoning": [],
    "awaiting_final_check": False,
    "question_count": 0,
    "max_questions": 5  # Limit questions
}

def reset_session():
    """Reset the conversation session."""
    global session
    session = {
        "symptoms": [],
        "answers": {},
        "conversation_history": [],
        "diagnosis_complete": False,
        "confirmed_disease": None,
        "reasoning": [],
        "awaiting_final_check": False,
        "question_count": 0,
        "max_questions": 5
    }

def extract_symptoms_from_text(text):
    """Extract symptoms from user text."""
    try:
        response = client.models.generate_content(
            model=os.getenv("model"),
            contents=["Extract symptoms, comma-separated lowercase:", text]
        )
        symptoms = response.text.strip()
        if symptoms and symptoms.upper() != 'NONE':
            return [s.strip() for s in symptoms.split(',')]
        return []
    except:
        return []

def should_give_diagnosis(symptoms, answers, history):
    """Check if we should give diagnosis now."""
    try:
        response = client.models.generate_content(
            model=os.getenv("model"),
            contents=[
                f"Symptoms: {', '.join(symptoms)}",
                f"Answers: {list(answers.values())}",
                f"Questions asked: {len(answers)}",
                "",
                "Do you have ENOUGH information to give a diagnosis? Answer YES or NO.",
                "Consider: symptoms, timing, triggers, location, associated symptoms."
            ]
        )
        return "YES" in response.text.upper()
    except:
        return False

def get_next_question(symptoms, answers, question_count):
    """Generate next question."""
    try:
        response = client.models.generate_content(
            model=os.getenv("model"),
            contents=[
                f"Symptoms: {', '.join(symptoms)}",
                f"Asked: {question_count}/5 questions",
                "Ask ONE short question about: TIME, TRIGGERS, LOCATION, or ASSOCIATED SYMPTOMS.",
                "Be specific. Return ONLY the question."
            ]
        )
        return response.text.strip()
    except:
        return "Any other symptoms?"

def diagnose(symptoms, answers, history):
    """Make diagnosis."""
    try:
        response = client.models.generate_content(
            model=os.getenv("model"),
            contents=[
                f"Symptoms: {', '.join(symptoms)}",
                f"Q&A: {'; '.join(history)}",
                "",
                "DISEASE: [name]",
                "CONFIDENCE: [0-100]",
                "REASONING: [brief explanation]",
                "KEY: [2-3 keywords]"
            ]
        )
        return response.text.strip()
    except:
        return None

def search_disease_in_file(disease):
    """Search database for remedies."""
    downloads = os.path.join(os.path.expanduser("~"), "Downloads")
    file_path = os.path.join(downloads, "Ayurvedic_merged.txt")
    
    if not os.path.exists(file_path):
        return []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        matches = []
        for line in lines:
            if disease.lower() in line.lower():
                matches.append(line.rstrip())
        return matches[:15]
    except:
        return []

def extract_answer_info(question, answer):
    """Extract key info."""
    try:
        response = client.models.generate_content(
            model=os.getenv("model"), contents=[f"{question} | {answer}", "4 words max:"]
        )
        return response.text.strip()
    except:
        return answer[:30]

def present_diagnosis(diagnosis_text, remedies):
    """Display diagnosis."""
    lines = diagnosis_text.split('\n')
    disease = confidence = reasoning = ""
    
    for line in lines:
        if line.startswith("DISEASE:"):
            disease = line.replace("DISEASE:", "").strip()
        elif line.startswith("CONFIDENCE:"):
            confidence = line.replace("CONFIDENCE:", "").strip()
        elif line.startswith("REASONING:"):
            reasoning = line.replace("REASONING:", "").strip()
    
    print("\n" + "=" * 55)
    print(f"🏥 DIAGNOSIS: {disease.upper()}")
    print(f"📊 Confidence: {confidence}%")
    print("=" * 55)
    print(f"\n💡 {reasoning}\n")
    
    if remedies:
        print("📚 AYURVEDIC APPROACH:")
        print("-" * 40)
        for r in remedies[:10]:
            if len(r) > 10:
                print(f"  • {r}")
        print("-" * 40)

# Welcome
print("=" * 55)
print("🩺 AYURVEDIC SYMPTOM CHECKER")
print("=" * 55)
print("Describe your symptoms. I'll ask key questions.\n")

while True:
    user_input = input("You: ")
    
    if user_input.lower() in ['exit', 'quit']:
        print("Goodbye!")
        break
    
    if user_input.lower() == 'reset':
        reset_session()
        print("✅ Reset. Start describing.\n")
        continue
    
    if session["diagnosis_complete"]:
        disease = session["confirmed_disease"]
        remedies = search_disease_in_file(disease)
        response = client.models.generate_content(
            model=os.getenv("model"),
            contents=[f"Diagnosis: {disease}", f"Q: {user_input}", "Answer:"]
        )
        print(f"\nAI: {response.text}\n")
        continue
    
    # Handle final check answer
    if session["awaiting_final_check"]:
        print("\n🔍 Finalizing assessment...\n")
        diagnosis = diagnose(session["symptoms"], session["answers"], session["conversation_history"])
        if diagnosis and "DISEASE:" in diagnosis:
            disease = diagnosis.split("DISEASE:")[1].split("\n")[0].strip()
            session["confirmed_disease"] = disease
            remedies = search_disease_in_file(disease)
            present_diagnosis(diagnosis, remedies)
        else:
            print("AI: Based on your symptoms, I recommend consulting an Ayurvedic practitioner.\n")
        session["diagnosis_complete"] = True
        continue
    
    # Initial symptoms
    if not session["symptoms"]:
        new_symptoms = extract_symptoms_from_text(user_input)
        if new_symptoms:
            session["symptoms"] = new_symptoms
        session["conversation_history"].append(user_input)
        session["question_count"] = 1
    
    # Ask next question or give diagnosis
    if session["question_count"] >= 3 and should_give_diagnosis(session["symptoms"], session["answers"], session["conversation_history"]):
        session["awaiting_final_check"] = True
        print("\nAI: Before I give my assessment - is there anything else about your symptoms, "
              "diet, lifestyle, or health that I haven't asked that could be relevant?")
    elif session["question_count"] >= 5:
        session["awaiting_final_check"] = True
        print("\nAI: One more thing - is there anything else I should know about your symptoms?")
    else:
        question = get_next_question(session["symptoms"], session["answers"], session["question_count"])
        session["last_question"] = question
        session["conversation_history"].append(f"Q: {question} A: {user_input}")
        session["question_count"] += 1
        print(f"\nAI: {question}\n")
