from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from qa_routes import router as chatbot_router
from handlers_qa.chroma_loader import load_chroma_db
from contextlib import asynccontextmanager
from handlers_autofill.document_process import KuzuSession

# Tải vector database khi ứng dụng khởi động
@asynccontextmanager
async def load_vector_db(app: FastAPI):
    print("Loading Chroma database...")
    chroma_db = load_chroma_db("./vector_db")
    kuzu_session = KuzuSession("default_user")
    
    app.state.chroma_db = chroma_db
    app.state.kuzu_session = kuzu_session
    if (app.state.chroma_db is None):
        print("Failed to load Chroma database.")
    else:
        print("Chroma database loaded successfully.")
        yield

    print("Cleaning up resources...")

# Khởi tạo ứng dụng FastAPI
app = FastAPI(
    title="Chatbot RAG API",
    version="1.0.0",
    description="An API for Chatbot using RAG pipeline.",
    lifespan=load_vector_db
)
# Cấu hình CORS cho phép gọi API từ bất kỳ domain nào
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],
)

# Gắn router cho chatbot
app.include_router(chatbot_router, prefix="", tags=["Chatbot"])

@app.get("/")
async def health_check():
    """
    Endpoint để kiểm tra trạng thái ứng dụng.
    """
    return {"status": "OK", "message": "Chatbot RAG API is running!"}