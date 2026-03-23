"""
Thin LLM wrapper.

Priority:
1. Google Gemini (GEMINI_API_KEY)
2. OpenAI (OPENAI_API_KEY)
3. Deterministic fallback
"""

import os
from typing import Optional


def _local_fallback(prompt: str) -> str:
    return (
        "Thank you for sharing. Could you please tell me a little more about:\n"
        "- When the symptoms started?\n"
        "- What makes them better or worse?\n"
        "- How severe they feel (mild/moderate/severe)?"
    )


def send(prompt: str, max_tokens: int = 256, model: Optional[str] = None) -> str:
    """
    Send prompt to an LLM and return a text reply.
    """

    # ==========================
    # 1️⃣ GEMINI
    # ==========================
    try:
        from google import genai
        from dotenv import load_dotenv
        
        # Ensure .env is loaded from the correct directory
        env_path = os.path.join(os.path.dirname(__file__), '.env')
        load_dotenv(dotenv_path=env_path)
        
        gem_key = os.getenv("GEMINI_API_KEY")

        if gem_key:
            client = genai.Client(api_key=gem_key)
            
            # Use gemini-2.0-flash by default as requested/standard
            model_name = model or "gemma-3-27b-it"

            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
            )

            if hasattr(response, "text") and response.text:
                return response.text.strip()

    except Exception:
        pass

    # ==========================
    # 2️⃣ OPENAI (fallback)
    # ==========================
    try:
        import openai

        key = os.environ.get("OPENAI_API_KEY")
        if key:
            openai.api_key = key

            response = openai.ChatCompletion.create(
                model=model or "gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a warm Ayurvedic assistant."},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=max_tokens,
            )

            return response.choices[0].message["content"].strip()

    except Exception:
        pass

    # ==========================
    # 3️⃣ FINAL FALLBACK
    # ==========================
    return _local_fallback(prompt)
