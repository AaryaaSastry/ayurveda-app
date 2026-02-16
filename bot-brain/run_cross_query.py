from google import genai
from dotenv import load_dotenv
import os
import re
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

# -----------------------
# ENV SETUP
# -----------------------

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
model_name = os.getenv("model")

client = genai.Client(api_key=api_key)

MAX_QUESTIONS = 3  # Reduced for smarter narrowing


# -----------------------
# SMART QUESTION ENGINE
# -----------------------

def get_single_question(facts: List[str]) -> str:
    facts_text = "\n".join(facts) if facts else "(no information yet)"

    prompt = f"""
You are a thoughtful and experienced Ayurvedic Vaidya speaking to a real patient.

Collected patient information:
{facts_text}

Your goal:
Understand the patient's condition clearly while keeping the interaction warm and natural.
Do NOT GREET THE PATIENT EVERY SINGLE TIME. If you have already greeted them and asked for their name, you can refer to them by name in follow-up questions, but do not repeat the greeting or ask for their name again.
Do Not give the summary of what was told previously while asking questions. 
You HAVE to know their age, gender, previous health history , one at a time if not already provided, but do NOT ask for all of these at once.
Avoid sounding like a checklist or medical form.
Use factors such as age and gender to guide your questioning, but do not ask for them directly if not needed. Instead, weave them into your questions naturally. 
If the user has provided the name, try to guess the gender, if and only if u cant then opt to ask. It is always recommmended to ask the gender.
Use the information already provided to ask the most relevant next question that will help clarify the diagnosis.
Use emojis if it feels natural, but do NOT overdo it. Use them to add warmth, not to replace meaningful questions.


You have ENOUGH information if:
- The main symptom is clear
- Duration is known
- Severity is known
- Nature of symptom (type of pain/discomfort) is known
- At least one associated OR aggravating factor is known

If these are reasonably understood, output exactly:
I HAVE ENOUGH INFORMATION

Guidelines:
- Ask ONLY ONE meaningful next question.
- Do NOT repeat information already provided.
- Do NOT complete a checklist mechanically.
- Use a calm, humane tone — like a real doctor listening carefully.
- Maximum TWO short sentences total.
- No diagnosis.
- No explanations.
- Output ONLY the question text or the stop phrase.

If enough clarity is achieved, stop asking and output:
I HAVE ENOUGH INFORMATION
"""

    response = client.models.generate_content(
        model=model_name,
        contents=[prompt],
        config={"temperature": 0.75}
    )

    text = response.text.strip()

    # Stop condition
    if text.upper().strip() == "I HAVE ENOUGH INFORMATION":
        return "I HAVE ENOUGH INFORMATION"

    # If model returned a question (with acknowledgment), preserve full text
    if "?" in text:
        return text

    # Safe fallback
    return "Could you share a little more about how this has been affecting you?"

def get_final_diagnosis(facts: List[str]) -> str:
    facts_text = "\n".join(facts)

    prompt = f"""
You are an expert, compassionate Ayurvedic doctor.

Based on the following patient information:

{facts_text}

Provide:

1. Most likely Ayurvedic diagnosis (Roga name).
2. Dominant Dosha involved and reasoning.
3. Severity (mild/moderate/severe).
4. Short clinical reasoning (5 lines).
5. Practical management direction.
6. Home-based herbs or remedies.

Be confident.
Do not ask further questions.
"""

    response = client.models.generate_content(
        model=model_name,
        contents=[prompt],
    )

    return response.text.strip()


def validate_diagnosis(facts: List[str], diagnosis_text: str) -> str:
    facts_text = "\n".join(facts)

    prompt = f"""
You are a senior clinical reviewer evaluating diagnostic accuracy.

Collected patient symptoms:
{facts_text}

Proposed Ayurvedic diagnosis:
{diagnosis_text}

Your task:
1. Check whether the diagnosis logically matches the symptom pattern.
2. Identify any contradictions or weak reasoning.
3. Assess whether this case represents a possible medical emergency.
4. If the diagnosis is weak or incorrect, correct it.
5. If emergency red flags exist, clearly state that emergency care is required.
6. If appropriate, reframe diagnosis under correct Ayurvedic category (e.g., Shotha, Jwara, etc.).

Output format:
- VALIDATION RESULT: (Valid / Partially Valid / Incorrect)
- Reasoning (concise clinical explanation)
- Corrected Diagnosis (if needed)
- Emergency Level: (None / Urgent / Immediate ER)
- Final Recommendation

Be objective, safety-focused, and clinically grounded.
Do NOT ask further questions.
"""

    response = client.models.generate_content(
        model=model_name,
        contents=[prompt],
        config={"temperature": 0.3}
    )

    return response.text.strip()


def extract_corrected_diagnosis(validation_text: str) -> str:
    if not validation_text:
        return ""

    # Look for explicit label like 'Corrected Diagnosis: ...'
    m = re.search(r"Corrected Diagnosis[:\-]\s*(.+)", validation_text, re.IGNORECASE)
    if m:
        return m.group(1).strip()

    # Look for a line with the label then the next non-empty line
    lines = validation_text.splitlines()
    for i, line in enumerate(lines):
        if "corrected diagnosis" in line.lower():
            for j in range(i + 1, min(i + 5, len(lines))):
                if lines[j].strip():
                    return lines[j].strip()

    return ""


def get_full_diagnosis_from_name(facts: List[str], diagnosis_name: str) -> str:
    facts_text = "\n".join(facts)

    prompt = f"""
You are an expert, compassionate Ayurvedic doctor.

The case facts:
{facts_text}

Please produce a full diagnostic assessment for the following diagnosis name (Roga):
{diagnosis_name}

Include:
1. Most likely Ayurvedic diagnosis (Roga name).
2. Dominant Dosha involved and reasoning.
3. Severity (mild/moderate/severe).
4. Short clinical reasoning (5 lines).
5. Practical management direction.
6. Herbs, vegetables, fruits what one can have must all be listed.
7. Herbs, vegetables, fruits what one can NOT have must all be listed
8. Home-based herbs or remedies based on what was mentioned above.

Be concise and safe. Output only the assessment text.
"""

    response = client.models.generate_content(
        model=model_name,
        contents=[prompt],
    )

    return response.text.strip()


# -----------------------
# RECIPE DECISION ENGINE
# -----------------------

def llm_should_offer_recipes(facts, diagnosis_text):
    # First, run clinical validation to ensure it's safe to offer home remedies
    validation = validate_diagnosis(facts, diagnosis_text)
    val_lower = validation.lower() if isinstance(validation, str) else ""

    # If validator indicates emergency/urgent situation, do NOT offer recipes
    if (
        "immediate er" in val_lower
        or "immediate emergency" in val_lower
        or ("emergency level" in val_lower and ("urgent" in val_lower or "immediate" in val_lower))
    ):
        return False

    prompt = f"""
Based on the patient information and diagnosis below, 
should the assistant offer 3 simple homemade Ayurvedic preparations?
One should be a savory dish, one a tea, and one a herbal concoction.
The format is: 
    Recipe name:
    Purpose:
    Ingredients:
    Steps: Clear sequential steps for home preparation using step 1 , step 2...


Answer ONLY YES or NO.

Facts:
{chr(10).join(facts)}

Diagnosis:
{diagnosis_text}
"""

    response = client.models.generate_content(
        model=model_name,
        contents=[prompt],
    )

    return response.text.strip().upper().startswith("Y")


def generate_recipes(facts, diagnosis_text):
    prompt = f"""
You are an Ayurvedic practitioner and practical home cook.

Based on the information below, produce exactly 3 simple, tasty homemade Ayurvedic preparations.

Context:
{chr(10).join(facts)}

Diagnosis:
{diagnosis_text}

Output rules:
- Numbered 1 to 3
- Name (short)
- Purpose (one line)
- Ingredients (short list)
- 5 short steps
- Add small safety note if needed
- Keep concise
"""

    response = client.models.generate_content(
        model=model_name,
        contents=[prompt],
    )

    return response.text.strip()


def generate_better_recipes(facts, diagnosis_text):
    prompt = f"""
You are an experienced Ayurvedic practitioner and culinary formulator.

Using the patient facts and the diagnosis below, produce exactly 3 different, improved Ayurvedic recipes tailored to this specific problem.

Important constraints:
- Base the recipes primarily on the herbs or ingredients mentioned in the diagnosis/assessment text above (if present).
- Produce exactly 3 recipes, numbered 1 to 3.
- For each recipe include: Name (short), Purpose (one line), Ingredients (short list), and AT LEAST 5 clear sequential steps.
- Keep instructions practical for home preparation.
- Add a one-line safety note if relevant.
- Be concise but clear.

Context:
Facts:
{chr(10).join(facts)}

Diagnosis/Assessment:
{diagnosis_text}

IMPORTANT: Output the recipes in valid JSON format only. Do NOT include any explanatory text. Use this exact structure:

[
  {
    "name": "Recipe Name",
    "purpose": "Purpose of the recipe",
    "ingredients": ["ingredient 1", "ingredient 2", "ingredient 3"],
    "steps": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"],
    "safety": "Safety note if applicable"
  },
  {
    "name": "Recipe Name",
    "purpose": "Purpose of the recipe",
    "ingredients": ["ingredient 1", "ingredient 2", "ingredient 3"],
    "steps": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"],
    "safety": "Safety note if applicable"
  },
  {
    "name": "Recipe Name",
    "purpose": "Purpose of the recipe",
    "ingredients": ["ingredient 1", "ingredient 2", "ingredient 3"],
    "steps": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"],
    "safety": "Safety note if applicable"
  }
]

Output ONLY valid JSON, no other text.
"""

    response = client.models.generate_content(
        model=model_name,
        contents=[prompt],
        config={"temperature": 0.6}
    )

    # Try to parse as JSON, if fails return fallback structure
    try:
        import json
        # Find JSON array in response
        text = response.text.strip()
        # Handle if response contains markdown code blocks
        if '```json' in text:
            text = text.split('```json')[1].split('```')[0]
        elif '```' in text:
            text = text.split('```')[1].split('```')[0]
        
        recipes = json.loads(text.strip())
        return recipes
    except Exception as e:
        # Return a structured fallback with the raw text
        return {"error": "parse_failed", "raw_text": response.text.strip()}


def generate_opening_message():
    prompt = """
You are a compassionate Ayurvedic Vaidya greeting a new patient.

Generate a warm, calm, human opening message.

Requirements:
- 2 short sentences maximum and this should be only the first interaction. Do NOT greet the patient by name after the first time.
- Begin by asking the patient's name and then invite their main health concern.
- Do not always greet the patient by name. Do it only the first time. after 
- Gentle, reassuring tone.
- Do NOT sound like a checklist or form.
- Use emojis if it feels natural, but do NOT overdo it. Use them to add warmth, not to replace meaningful questions.
- Invite the patient to share their main health concern.
- Do NOT sound dramatic.
- Do NOT mention diagnosis.
- Do NOT be overly spiritual.
- Keep it natural and professional.
- Output ONLY the greeting text.
"""

    response = client.models.generate_content(
        model=model_name,
        contents=[prompt],
        config={"temperature": 0.8}
    )

    return response.text.strip()


    @app.get("/opening")
    def opening():
        text = generate_opening_message()
        return {"opening": text}


# -----------------------
# FASTAPI SERVER
# -----------------------

app = FastAPI(title="Ayurveda Clinical Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://localhost:3000", "http://192.168.0.13:8000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class FactsPayload(BaseModel):
    facts: List[str] = []


class FinalizePayload(BaseModel):
    facts: List[str] = []


class RecipesPayload(BaseModel):
    facts: List[str] = []
    diagnosis: Optional[str] = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return {"message": "Ayurveda Clinical Assistant API is running"}

@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/ask")
def ask(payload: FactsPayload):
    # Count how many Q&A pairs exist (Patient: or Q: entries)
    question_count = sum(1 for f in payload.facts if f.startswith("Patient:") or f.startswith("Q:"))

    # If we've reached max questions, generate diagnosis instead of just returning stop message
    if question_count >= MAX_QUESTIONS:
        question = "I HAVE ENOUGH INFORMATION"
    elif not payload.facts:
        question = generate_opening_message()
    else:
        question = get_single_question(payload.facts)

    # If the LLM signals we have enough information, return the stop phrase
    # plus the final diagnosis block so API callers get the result immediately
    if question == "I HAVE ENOUGH INFORMATION":
        diagnosis = get_final_diagnosis(payload.facts)
        validation = validate_diagnosis(payload.facts, diagnosis)

        corrected = extract_corrected_diagnosis(validation)
        final_diag_name = corrected if corrected else ""

        if final_diag_name:
            final_full_text = get_full_diagnosis_from_name(payload.facts, final_diag_name)
        else:
            final_full_text = diagnosis

        # Decide whether to OFFER recipes (do not generate them automatically)
        recipes_offer = False
        try:
            diag_for_recipes = final_diag_name if final_diag_name else diagnosis
            recipes_offer = bool(llm_should_offer_recipes(payload.facts, diag_for_recipes))
        except Exception:
            recipes_offer = False

        emergency_flag = False
        if "immediate er" in validation.lower() or "immediate emergency" in validation.lower():
            emergency_flag = True

        return {
            "question": question,
            "final_diagnosis": final_full_text,
            "validated_review": validation,
            "offer_recipes": recipes_offer,
            "emergency": emergency_flag,
        }

    return {"question": question}


def ask_question(payload: FactsPayload):
    question = get_single_question(payload.facts)
    return {"question": question}


@app.post("/finalize")
def finalize(payload: FinalizePayload):
    diagnosis = get_final_diagnosis(payload.facts)
    validation = validate_diagnosis(payload.facts, diagnosis)

    # Extract corrected diagnosis if validator provided one
    corrected = extract_corrected_diagnosis(validation)
    final_diag_name = corrected if corrected else ""

    # If validator provided a corrected diagnosis name, regenerate the full diagnostic block
    if final_diag_name:
        final_full_text = get_full_diagnosis_from_name(payload.facts, final_diag_name)
    else:
        final_full_text = diagnosis

    # Emergency override: if validator signals Immediate ER, escalate
    if "immediate er" in validation.lower() or "immediate emergency" in validation.lower():
        return {
            "final_diagnosis": final_full_text,
            "emergency": True,
            "message": "Based on symptom severity, immediate medical care is strongly advised.",
            "validated_review": validation,
            "offer_recipes": False
        }
    # Decide whether to OFFER recipes (do not generate them automatically)
    recipes_offer = False
    try:
        diag_for_recipes = final_diag_name if final_diag_name else diagnosis
        recipes_offer = bool(llm_should_offer_recipes(payload.facts, diag_for_recipes))
    except Exception:
        recipes_offer = False

    return {
        "final_diagnosis": final_full_text,
        "offer_recipes": recipes_offer
    }


@app.post("/should_offer_recipes")
def should_offer(payload: RecipesPayload):
    ok = llm_should_offer_recipes(payload.facts, payload.diagnosis or "")
    return {"offer_recipes": bool(ok)}


@app.post("/recipes")
def recipes(payload: RecipesPayload):
    recipes_data = generate_better_recipes(payload.facts, payload.diagnosis or "")
    return {"recipes": recipes_data}


# -----------------------
# CLI MODE (Optional)
# -----------------------

def main():
    facts = []
    question_count = 0

    # Use the same logic as /ask API - get first question directly
    first_question = get_single_question(facts)
    print("\n" + first_question + "\n")

    # If the model immediately signals enough information, produce final assessment
    if first_question == "I HAVE ENOUGH INFORMATION":
        print("\n--- FINAL ASSESSMENT ---\n")
        diagnosis = get_final_diagnosis(facts)
        validation = validate_diagnosis(facts, diagnosis)

        corrected = extract_corrected_diagnosis(validation)
        final_diag_name = corrected if corrected else ""

        if final_diag_name:
            final_full_text = get_full_diagnosis_from_name(facts, final_diag_name)
        else:
            final_full_text = diagnosis

        print(final_full_text + "\n")

        diag_for_recipes = final_diag_name if final_diag_name else diagnosis
        try:
            offer = llm_should_offer_recipes(facts, diag_for_recipes)
        except Exception:
            offer = False

        if offer:
            while True:
                ans = input("Would you like 3 simple home remedies? (yes/no) ").strip().lower()
                if ans in ["y", "yes", "n", "no"]:
                    break
                print("Please answer 'yes' or 'no'.")

            if ans in ["y", "yes","okay","ok"]:
                remedies = generate_recipes(facts, diag_for_recipes)
                print(remedies + "\n")

            while True:
                ans2 = input("Do you want me to give you better recipes based on the herbs provided above? (yes/no) ").strip().lower()
                if ans2 in ["y", "yes", "n", "no"]:
                    break
                print("Please answer 'yes' or 'no'.")

            if ans2 in ["y", "yes"]:
                better = generate_better_recipes(facts, final_full_text)
                print(better + "\n")

        if "immediate er" in validation.lower() or "immediate emergency" in validation.lower():
            print("EMERGENCY: Immediate medical care is strongly advised.\n")

        print("\n------------------------\n")
        return

    while True:

        if question_count >= MAX_QUESTIONS:
            print("\n--- FINAL ASSESSMENT ---\n")
            diagnosis = get_final_diagnosis(facts)
            validation = validate_diagnosis(facts, diagnosis)

            corrected = extract_corrected_diagnosis(validation)
            final_diag_name = corrected if corrected else ""

            if final_diag_name:
                final_full_text = get_full_diagnosis_from_name(facts, final_diag_name)
            else:
                final_full_text = diagnosis

            print(final_full_text + "\n")

            # Offer recipes option to the user (do not auto-generate)
            diag_for_recipes = final_diag_name if final_diag_name else diagnosis
            try:
                offer = llm_should_offer_recipes(facts, diag_for_recipes)
            except Exception:
                offer = False

            if offer:
                # Ask for simple home remedies (require yes/no)
                while True:
                    ans = input("Would you like 3 simple home remedies? (yes/no) ").strip().lower()
                    if ans in ["y", "yes", "n", "no"]:
                        break
                    print("Please answer 'yes' or 'no'.")

                if ans in ["y", "yes","okay","ok"]:
                    remedies = generate_recipes(facts, diag_for_recipes)
                    print(remedies + "\n")

                # After simple remedies, ask if user wants better recipes based on herbs
                while True:
                    ans2 = input("Do you want me to give you better recipes based on the herbs provided above? (yes/no) ").strip().lower()
                    if ans2 in ["y", "yes", "n", "no"]:
                        break
                    print("Please answer 'yes' or 'no'.")

                if ans2 in ["y", "yes"]:
                    better = generate_better_recipes(facts, final_full_text)
                    print(better + "\n")

            if "immediate er" in validation.lower() or "immediate emergency" in validation.lower():
                print("EMERGENCY: Immediate medical care is strongly advised.\n")

            print("\n------------------------\n")
            break

        if not facts:
            user_input = input("> ").strip()
            if user_input.lower() in ["exit", "quit"]:
                break
            facts.append(f"Patient: {user_input}")
            question_count += 1
            continue

        question = get_single_question(facts)

        if question == "I HAVE ENOUGH INFORMATION":
            print("\n--- FINAL ASSESSMENT ---\n")
            diagnosis = get_final_diagnosis(facts)
            validation = validate_diagnosis(facts, diagnosis)

            corrected = extract_corrected_diagnosis(validation)
            final_diag_name = corrected if corrected else ""

            if final_diag_name:
                final_full_text = get_full_diagnosis_from_name(facts, final_diag_name)
            else:
                final_full_text = diagnosis

            print(final_full_text + "\n")

            # Offer recipes option to the user (do not auto-generate)
            diag_for_recipes = final_diag_name if final_diag_name else diagnosis
            try:
                offer = llm_should_offer_recipes(facts, diag_for_recipes)
            except Exception:
                offer = False

            if offer:
                # Ask for simple home remedies (require yes/no)
                while True:
                    ans = input("Would you like 3 simple home remedies? (yes/no) ").strip().lower()
                    if ans in ["y", "yes", "n", "no"]:
                        break
                    print("Please answer 'yes' or 'no'.")

                if ans in ["y", "yes"]:
                    remedies = generate_recipes(facts, diag_for_recipes)
                    print(remedies + "\n")

                # After simple remedies, ask if user wants better recipes based on herbs
                while True:
                    ans2 = input("Do you want me to give you better recipes based on the herbs provided above? (yes/no) ").strip().lower()
                    if ans2 in ["y", "yes", "n", "no"]:
                        break
                    print("Please answer 'yes' or 'no'.")

                if ans2 in ["y", "yes"]:
                    better = generate_better_recipes(facts, final_full_text)
                    print(better + "\n")

            if "immediate er" in validation.lower() or "immediate emergency" in validation.lower():
                print("EMERGENCY: Immediate medical care is strongly advised.\n")

            print("\n------------------------\n")
            break

        print("\n" + question + "\n")

        user_input = input("> ").strip()
        if user_input.lower() in ["exit", "quit"]:
            break

        facts.append(f"Q: {question} A: {user_input}")
        question_count += 1


if __name__ == "__main__":
    import sys

    if "--cli" in sys.argv:
        main()
    else:
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=8000)
