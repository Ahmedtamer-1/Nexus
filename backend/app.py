from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import shutil

from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

app = FastAPI(title="Legal RAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("data", exist_ok=True)
VECTOR_STORE_PATH = "faiss_index"

@app.get("/")
async def root():
    return {"status": "ok", "message": "Legal RAG API is running. Use /ingest or /chat endpoints."}


try:
    embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-base-en-v1.5")
except Exception as e:
    print("Warning: could not load embeddings model:", e)
    embeddings = None

def get_vectorstore():
    if os.path.exists(VECTOR_STORE_PATH) and embeddings:
        return FAISS.load_local(VECTOR_STORE_PATH, embeddings, allow_dangerous_deserialization=True)
    return None

@app.post("/ingest")
async def ingest_document(file: UploadFile = File(...)):
    if not embeddings:
        raise HTTPException(status_code=500, detail="Embeddings model not loaded.")
        
    file_path = f"data/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    if file.filename.endswith(".pdf"):
        loader = PyPDFLoader(file_path)
    else:
        loader = TextLoader(file_path)
        
    docs = loader.load()
    
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    splits = text_splitter.split_documents(docs)
    
    vectorstore = get_vectorstore()
    if vectorstore is None:
        vectorstore = FAISS.from_documents(splits, embeddings)
    else:
        vectorstore.add_documents(splits)
    
    vectorstore.save_local(VECTOR_STORE_PATH)
    return {"message": f"Successfully ingested {file.filename}"}

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    api_key: str = None
    model: str = "gpt-4o-mini"

@app.post("/chat")
async def chat(request: ChatRequest):
    vectorstore = get_vectorstore()
    if not vectorstore:
        raise HTTPException(status_code=400, detail="No documents ingested yet. Please ingest PDFs first using the /ingest endpoint.")
    
    api_key = request.api_key or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=400, detail="OpenAI API key is missing.")
        
    os.environ["OPENAI_API_KEY"] = api_key
    
    if api_key.startswith("sk-or-"):
        llm = ChatOpenAI(model=request.model, temperature=0.2, base_url="https://openrouter.ai/api/v1")
    else:
        llm = ChatOpenAI(model=request.model, temperature=0.2)
        
    retriever = vectorstore.as_retriever()
    
    system_prompt = (
        "You are an expert Legal AI Assistant. Use the following pieces of retrieved "
        "legal context to answer the question. If you don't know the answer based "
        "on the context, say that you don't know. Always cite the relevant parts from the context.\n\n"
        "Context: {context}"
    )
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
    ])
    
    user_query = request.messages[-1].content
    docs = retriever.invoke(user_query)
    context = "\n\n".join(doc.page_content for doc in docs)
    
    chain = prompt | llm | StrOutputParser()
    answer = chain.invoke({"context": context, "input": user_query})
    
    sources = "\n\n**Sources Used:**\n"
    for i, doc in enumerate(docs):
        page = doc.metadata.get('page', 'Unknown')
        sources += f"- Page {page}: {doc.page_content[:150]}...\n"
        
    return {
        "choices": [
            {"message": {"content": answer + sources}}
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
