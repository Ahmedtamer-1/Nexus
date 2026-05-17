import requests
import time

API_URL = "http://localhost:8002"

print("1. Ingesting fake_contract.txt...")
with open("fake_contract.txt", "rb") as f:
    files = {"file": ("fake_contract.txt", f, "text/plain")}
    response = requests.post(f"{API_URL}/ingest", files=files)
    print("Ingest Response:", response.json())

time.sleep(1)

print("\n2. Querying RAG Pipeline...")
# Note: Ensure you have OPENAI_API_KEY exported in your environment or passed here.
# Since OpenRouter uses a different base URL for GPT-4o, we can use an OpenRouter key,
# but we need to configure the Base URL for ChatOpenAI in app.py if using OpenRouter.
# For this test script, if OpenAI key is not set, it might fail. I'll mock the Chat request in app.py or rely on the user providing it.
# Actually, I'll just pass a fake api key to see if it reaches the LLM. 
# Wait! Let's provide a basic message to see if we get the FAISS context.

payload = {
    "messages": [{"role": "user", "content": "What does the contract say about pandemics and force majeure?"}],
    "model": "gpt-4o-mini"
}

# If OPENAI_API_KEY is not in env, we must provide api_key
import os
key = os.getenv("OPENAI_API_KEY")
if not key:
    payload["api_key"] = "sk-fake-key" # this will fail at the OpenAI call, but we can verify it reaches it!

response = requests.post(f"{API_URL}/chat", json=payload)
print("Chat Response:", response.json())
