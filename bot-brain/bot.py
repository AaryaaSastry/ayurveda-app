# from google import genai
from gemini_client import send
from candidate_engine import get_candidates
from nlp.dosha_scoring import score_sentence
from retrieval_agent import get_semantic_context  # NEW: Vector DB search
from dotenv import load_dotenv
import os

# Load environment variables from .env file
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=env_path)

# The client is now handled by gemini_client.py
# client = genai.Client(api_key=api_key)

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
        prompt = f"Extract symptoms from the following text. Return them as a comma-separated list of lowercase phrases. If no symptoms are found, return 'NONE'.\n\nText: {text}"
        response_text = send(prompt)
        if response_text and response_text.upper() != 'NONE':
            return [s.strip() for s in response_text.split(',')]
        return []
    except:
        return []


def get_current_dosha_profile(history):
    """Calculate dosha profile from conversation history."""
    all_text = " ".join(history)
    return score_sentence(all_text)

def should_give_diagnosis(symptoms, answers, history):
    """Check if we should give diagnosis now."""
    # Never diagnose during the hard-coded onboarding phase (first 3 bots = history < 7)
    if len(history) < 7:
        return False

    # Force diagnosis after 5-6 AI-lead questions (approx history length 12)
    if len(history) >= 12: 
        return True
        
    try:
        prompt = (
            f"Symptoms: {', '.join(symptoms)}\n"
            f"Answers: {list(answers.values())}\n"
            f"Conversation History: {history}\n\n"
            "Based on the conversation history, do you have enough specific clinical information "
            "(duration, quality, aggravating/relieving factors) to provide a definitive Ayurvedic "
            "diagnosis and a professional medical report?\n"
            "If yes, return YES. If no, return NO."
        )
        response_text = send(prompt)
        return "YES" in response_text.upper()
    except:
        return False


def get_next_question(symptoms, history):
    """Generate next question based on current symptoms and knowledge base."""
    # Logic for hard-coded phase (History length tracks User: and Bot: messages)
    
    # 1. Greeting & Basic Details (Initial Bot Message - triggered by 'START_CONVERSATION')
    if len(history) == 0:
        return (
            "Namaste! I am your Ayurvedic AI assistant. I am here to help you understand your health through the wisdom of Ayurveda. Let's begin by getting to know you better.---NEXT_BUBBLE---"
            "To provide an accurate assessment, could you please share your basic details? I need your Name, Age, Gender, Height, Weight, and any major lifestyle factors (like diet or sleep patterns)."
        )

    # 2. Q&A MODE AFTER DIAGNOSIS (Move this checking down so it doesn't catch empty history)
    if any("---REPORT_DATA---" in h for h in history):
        prompt = (
            f"You are an Ayurvedic AI assistant. The user has already received their diagnosis report.\n"
            f"Context: {history[-5:]}\n"
            f"User Question: {history[-1]}\n\n"
            "Answer the question in exactly 3 to 5 lines of simple, clear text. "
            "Focus ONLY on explaining the diagnosis or providing further Ayurvedic context for their issue. "
            "Do not prescribe new treatments. Keep it simple and compassionate."
        )
        return send(prompt)

    # 2. Main Issue (after user gives details via legacy flow)
    if len(history) == 2:
        return "Thank you. Now, please describe exactly what health issue or symptoms you are experiencing today in as much detail as possible."

    # 3. If user directly initiates the chat with a symptom block (e.g. they clicked a frontend suggestion)
    if len(history) == 1:
        user_first_msg = history[0].replace("User: ", "")
        prompt = (
            f"The user just started the consultation by stating: '{user_first_msg}'\n"
            "You are an Ayurvedic AI assistant. Generate a highly empathetic response that does TWO things:\n"
            "1. Acknowledges their specific issue and asks ONE brief follow-up question perfectly tailored to it to get them to explain their issue in deeper detail (e.g. 'Could you describe when during the day your allergy symptoms are usually worst?').\n"
            "2. Asks the user to provide their basic details (name,age, gender, height, weight) and daily routine (diet, lifestyle, active vs sedentary) before proceeding with the full consultation.\n"
            "Keep the response professional, small and natural"
            "Let maximum of 50 words be used"
        )
        return send(prompt)

    # --- AI INVOLVED AFTER THIS POINT ---
    
    # Safety Check: If we somehow get here after 12 messages (adjusting for hard-coded phase), force a summary
    if len(history) >= 12:
        return "I have gathered enough information. Please type 'diagnose' to see your medical report."

    dosha_profile = get_current_dosha_profile(history)
    candidates = get_candidates(symptoms, dosha_profile=dosha_profile, top_n=2)
    
    context = ""
    if candidates:
        context = "Potentially matching conditions from books:\n"
        for c in candidates:
            # Safely handle record content
            rec = c.get('record', {})
            symptom_text = rec.get('symptoms', '') if isinstance(rec, dict) else ""
            context += f"- {symptom_text}\n"

    prompt = (
        f"Symptoms: {', '.join(symptoms)}\n"
        f"Knowledge Context: {context}\n"
        f"History: {'; '.join(history)}\n\n"
        "Based on the symptoms and the knowledge context, ask ONE short, specific follow-up question "
        "to differentiate between potential Ayurvedic conditions. Focus on: TIME, TRIGGERS, LOCATION, or QUALITIES. "
        "DO NOT repeat a question already asked in History. "
        "Return ONLY the question."
        "ASK USER THEIR BASIC DETAILS SUCH AS AGE, HEIGHT, WEIGHT,GENDER, AND ANY MAJOR LIFESTYLE FACTORS IF NOT ALREADY MENTIONED IN THE HISTORY."
        "Ensure you understand the major symptom that the user mentioned. questions should be only based on that"
        "Understand the user age and gender. Ask appropriate questions based on that. For example, if the user is a woman of childbearing age, ask about menstrual cycle, pregnancy, etc. If the user is elderly, ask about chronic conditions, digestion, sleep, etc."
        "Ask only 1 question at a time. Do not ask multiple questions. Do not ask vague questions. Be specific and focused on differentiating the diagnosis based on the symptoms and knowledge context."
        "DO NOT USE ANY SANSKRIT TERMS IN THE QUESTION. Use simple, clear language that a general user would understand. Avoid technical jargon or Ayurvedic terms in the question. The question should be easily understandable to someone without medical knowledge."
    )
    
    response = send(prompt)
    if not response or len(response) < 5:
        return "Can you describe the timing or triggers of these symptoms?"
    return response


def diagnose(symptoms, history):
    """Make diagnosis using retrieved knowledge from books."""
    try:
        # Check history length - if it's very short, add a hint for more detail
        if len(history) < 6:
            return "I need a bit more detail to provide a professional report. Could you tell me more about when this happens or what makes it worse?"

        dosha_profile = get_current_dosha_profile(history)
        candidates = get_candidates(symptoms, dosha_profile=dosha_profile, top_n=3)
        
        kb_context = "REFERENCE KNOWLEDGE FROM AYURVEDIC TEXTS:\n"
        if candidates:
            for c in candidates:
                rec = c['record']
                kb_context += f"Condition: {c.get('id', 'Unknown')}\n"
                kb_context += f"Symptoms described in books: {rec.get('symptoms', 'N/A')}\n"
                kb_context += f"Causes: {rec.get('causes', 'N/A')}\n"
                kb_context += f"Treatments: {rec.get('treatment', 'N/A')}\n\n"
        else:
            kb_context += "No direct matches found in reference books. Use general Ayurvedic principles.\n"

        prompt = (
            f"{kb_context}\n"
            f"USER CASE:\n"
            f"Current Symptoms: {', '.join(symptoms)}\n"
            f"Conversation History: {'; '.join(history)}\n\n"
            "You are an Ayurvedic AI. Generate a response in exactly two parts separated by '---REPORT_DATA---'.\n"
            "\n"
            "PART 1: CHAT SUMMARY\n"
            "Provide a short, compassionate summary (2-3 sentences) of the diagnosis for the chat window.\n"
            "\n"
            "---REPORT_DATA---\n"
            "\n"
            "PART 2: DETAILED MEDICAL REPORT (JSON FORMAT)\n"
            "Provide a full medical report as a valid JSON object with these keys:\n"
            "{\n"
            "  \"patientInfo\": { \"name\": \"...\", \"age\": \"...\", \"gender\": \"...\", \"height\": \"...\", \"weight\": \"...\", \"constitution\": \"...\" },\n"
            "  \"symptomsReported\": [\"...\", \"...\"],\n"
            "  \"diagnosis\": { \"name\": \"...\", \"reasoning\": \"...\" },\n"
                "  \"threatLevel\": \"Low/Moderate/High (based on symptoms like fever or acute pain)\",\n"
            "  \"treatments\": [\"Top 5 Ayurvedic treatment categories required to cure this disease (e.g., Panchakarma, Shirodhara, Dietary Therapy, Kayachikitsa, etc)\"],\n"
            "  \"lifestyleChanges\": [\"...\", \"...\"],\n"
            "  \"dietaryGuide\": {\n"
            "    \"toConsume\": [\"...\"],\n"
            "    \"toAvoid\": [\"...\"]\n"
            "  },\n"
            "  \"herbalPreparations\": [\n"
            "    { \"name\": \"...\", \"purpose\": \"...\", \"ingredients\": [...], \"steps\": [...], \"safety\": \"...\" }\n"
            "  ],\n"
            "  \"prognosis\": \"...\",\n"
            "  \"disclaimer\": \"This report is generated by an Ayurvedic AI for informational purposes. It is NOT a substitute for professional medical advice, diagnosis, or treatment. Please consult a qualified Ayurvedic practitioner or medical doctor before starting any treatment.\"\n"
            "}\n"
            "\n"
            "CRITICAL:\n"
            "- Extract name, age, gender, height, and weight from history (use 'Not provided' if missing).\n"
            "- The section after ---REPORT_DATA--- MUST be valid raw JSON only.\n"
            "- Tone must be professional and authoritative."
        )
        return send(prompt)
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
        prompt = f"Question: {question}\nAnswer: {answer}\nSummarize the answer's key point in 4 words or less."
        return send(prompt)
    except:
        return answer[:30]


def present_diagnosis(diagnosis_text):
    """Display diagnosis including book treatments."""
    lines = diagnosis_text.split('\n')
    disease = confidence = reasoning = treatment = ""
    
    for line in lines:
        if line.startswith("DISEASE:"):
            disease = line.replace("DISEASE:", "").strip()
        elif line.startswith("CONFIDENCE:"):
            confidence = line.replace("CONFIDENCE:", "").strip()
        elif line.startswith("REASONING:"):
            reasoning = line.replace("REASONING:", "").strip()
        elif line.startswith("TREATMENT:"):
            treatment = line.replace("TREATMENT:", "").strip()
    
    print("\n" + "=" * 55)
    print(f"🏥 DIAGNOSIS: {disease.upper()}")
    print(f"📊 Confidence: {confidence}%")
    print("=" * 55)
    print(f"\n💡 Reasoning: {reasoning}")
    
    if treatment:
        print(f"\n📚 AYURVEDIC TREATMENT (from book text):")
        print("-" * 40)
        print(f"  {treatment}")
        print("-" * 40)

if __name__ == "__main__":
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
            prompt = f"User asked a question about their confirmed diagnosis {disease}. Answer using Ayurvedic principles and general knowledge.\nQuestion: {user_input}\nAnswer:"
            response_text = send(prompt)
            print(f"\nAI: {response_text}\n")
            continue
        
        # Handle final check answer
        if session["awaiting_final_check"]:
            print("\n🔍 Finalizing assessment using book data...\n")
            diagnosis = diagnose(session["symptoms"], session["conversation_history"])
            if diagnosis and "DISEASE:" in diagnosis:
                present_diagnosis(diagnosis)
                session["diagnosis_complete"] = True
                session["confirmed_disease"] = diagnosis.split("DISEASE:")[1].split("\n")[0].strip()
            else:
                print("Sorry, I could not finalize a diagnosis. Please try again or provide more details.")
            continue

        # Process user input and update history
        session["conversation_history"].append(f"User: {user_input}")

        # NEW: Initial symptom extraction or adding more symptoms
        extracted = extract_symptoms_from_text(user_input)
    if extracted:
        session["symptoms"].extend(extracted)
        session["symptoms"] = list(set(session["symptoms"])) # Unique
    
    # Generate reasoning/answer summary for history logic
    if session["question_count"] > 0:
        last_q = next(reversed([q for q in session["conversation_history"] if not q.startswith("User:") and not q.startswith("Answer:") and not q.startswith("AI:")]), "Previous Question")
        summary = extract_answer_info(last_q, user_input)
        session["answers"][last_q] = summary

    # Check if we should diagnose or ask more
    if should_give_diagnosis(session["symptoms"], session["answers"], session["conversation_history"]):
        session["awaiting_final_check"] = True
        print("\nAI: I have a potential diagnosis in mind based on the books. Shall I proceed? (Yes/No)")
    elif session["question_count"] >= session["max_questions"]:
        session["awaiting_final_check"] = True
        print("\nAI: I've good amount of information. Shall I provide a diagnosis based on the books? (Yes/No)")
    else:
        next_q = get_next_question(session["symptoms"], session["conversation_history"])
        session["conversation_history"].append(f"AI: {next_q}")
        session["question_count"] += 1
        print(f"\nAI: {next_q}\n")
