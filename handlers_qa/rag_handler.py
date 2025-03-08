import os
import json
from dotenv import load_dotenv
from langchain.retrievers import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever
from langchain.schema import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableMap, RunnablePassthrough
from langchain_openai import ChatOpenAI
from sentence_transformers import CrossEncoder

# Load biến môi trường từ file .env
load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")

# Khởi tạo mô hình LLM với cấu hình
llm = ChatOpenAI(
    temperature=0.1,
    streaming=True,
    model="gpt-4o-mini",
    openai_api_key=openai_api_key,
)

# Định nghĩa mẫu prompt cho hệ thống
system_prompt = """
You are an government public service helper named PublicDocGenie. You are here to help people with their legal questions.
Here is the context you should refer to:
{context}
Your response must be in Vietnamese and should be as detailed and easy to understand as possible, especially for users who are not familiar with legal terms. 
Please provide clear explanations and examples if necessary. 
If there is no relevant documentation, reply "Chúng tôi không tìm thấy thông tin liên quan."
"""

qa_prompt_template = ChatPromptTemplate.from_messages(
    [("system", system_prompt), ("human", "Question: {question}")]
)

rag_chain_qa = (
    RunnableMap(
        {"context": RunnablePassthrough(), "question": RunnablePassthrough()}
    )
    | qa_prompt_template
    | llm
    | StrOutputParser()
)

class EnhancedEnsembleRetriever:
    def __init__(self, retrievers, weights, reranker_model=None):
        """
        Initialize the ensemble retriever with multiple retrievers and optional reranker.
        """
        self.retrievers = retrievers
        self.weights = weights
        self.reranker = CrossEncoder(reranker_model) if reranker_model else None

    def invoke(self, query):
        """
        Invoke the retrievers to get relevant documents and re-rank if necessary.
        """
        # 1. Lấy kết quả từ từng retriever
        all_results = []
        for retriever, weight in zip(self.retrievers, self.weights):
            results = retriever.invoke(query)
            for doc in results:
                # Áp dụng trọng số cho từng tài liệu
                doc.metadata['score'] = doc.metadata.get('score', 1.0) * weight
            all_results.extend(results)

        # 2. Loại bỏ trùng lặp (nếu cần) theo nội dung
        unique_results = []
        seen_content = set()

        for doc in all_results:
            content = doc.page_content
            if content not in seen_content:
                unique_results.append(doc)
                seen_content.add(content)
        
        # 3. Rerank nếu có mô hình reranker
        if self.reranker:
            query_doc_pairs = [(query, doc.page_content) for doc in unique_results]
            scores = self.reranker.predict(query_doc_pairs)
            reranked_results = sorted(
                zip(unique_results, scores),
                key=lambda x: x[1],  # Sắp xếp theo điểm số
                reverse=True
            )
            return [doc for doc, score in reranked_results]

        # 4. Nếu không rerank, trả về kết quả theo trọng số
        return sorted(unique_results, key=lambda x: x.metadata['score'], reverse=True)
    

def create_retriever(vector_db, query, k=4):
    vector_db_retriever = vector_db.as_retriever(search_type="similarity", 
                                                             search_kwargs={"k": 4})
    
    # Lấy 250 tài liệu từ vector database và sử dụng BM25 để lọc kết quả
    bm25_documents_before = vector_db.as_retriever(search_type="similarity", search_kwargs={"k": 250})
    documents_bm25 = [Document(page_content = doc.page_content, metadata = doc.metadata) for doc in 
                      bm25_documents_before.invoke(query)]

    bm25_retriever = BM25Retriever.from_documents(documents_bm25)
    bm25_retriever.k = k

    # Kết hợp cả Chroma và BM25 vào một ensemble retriever
    ensemble_retriever = EnhancedEnsembleRetriever(
        retrievers=[vector_db_retriever, bm25_retriever],
        weights=[0.7, 0.3],
        reranker_model='cross-encoder/ms-marco-MiniLM-L-12-v2'
    )

    return ensemble_retriever

def retrieve_documents(retriever, query, top_k=5):
    documents = retriever.invoke(query)
    return documents[:top_k]

# Hàm định dạng tài liệu thành chuỗi
def format_docs(docs):
    """
    Định dạng các tài liệu thành chuỗi văn bản cho hệ thống RAG.
    """
    formatted_docs =""
    for i, doc in enumerate(docs):
        formatted_docs += f"Document {i+1}:\n{doc.page_content}\n\n"
        
    return formatted_docs


# Hàm gọi chuỗi RAG và sinh câu trả lời
def generate_answer_qa(vector_db, question, top_k=4):
    """
    Sinh câu trả lời cho câu hỏi dựa trên cơ sở dữ liệu vector và chuỗi RAG.
    """
    # Tạo retriever kết hợp
    ensemble_retriever = create_retriever(vector_db, question, k=top_k)
    
    # Lấy các tài liệu phù hợp
    docs = retrieve_documents(ensemble_retriever, question, top_k=top_k)
    
    # Lấy các thông tin từ metadata của tài liệu (title)
    seen_titles = set()
    unique_titles = []

    for doc in docs:
        title = doc.metadata.get('title', 'no title')
        
        if title not in seen_titles:
            seen_titles.add(title)
            unique_titles.append(title)
    
    # Định dạng các tài liệu thành chuỗi văn bản
    formatted_docs = format_docs(docs)

    # Gọi chuỗi RAG để tạo câu trả lời
    output = rag_chain_qa.invoke({"context": formatted_docs, "question": question})
    return output, unique_titles

if __name__ == "__main__":
    from chroma_loader import load_chroma_db
    # Load vector database
    vector_db = load_chroma_db("../vector_db")
    
    # Test question
    question = "Thủ tục đăng ký kinh doanh hộ gia đình như thế nào?"

    # Generate answer
    answer, titles = generate_answer_qa(vector_db, question, top_k=5)
    print("Answer:", answer)
    print("Titles:", titles)