from handlers_autofill.document_process import KuzuSession, info_to_graph_documents, extract_documents_from_info, match_required_info
from handlers_autofill.document_process import autofill_chain_qa, return_text_from_documents, return_text_from_images
from handlers_autofill.document_process import extract_required_info, extract_required_info_and_documents, remove_tags
from handlers_qa.rag_handler import create_retriever, retrieve_documents, format_docs
from handlers_qa.chroma_loader import load_chroma_db
from fastapi import APIRouter, HTTPException, Request, File, UploadFile, Form
from schemas.schema import AutofillResponse, AutofillRequiredInfoResponse
from typing import List

# Khởi tạo router cho chatbot
router = APIRouter()

def check_document_info_validity(graph_db: KuzuSession, vector_db, info: str, top_k=3, max_attempts = 2):
    """
    Check the validity of the extracted information and documents in the graph database
    with the law documents retrieved from the vector database.
    """
    graph_documents = info_to_graph_documents(info)
    add_graph_documents_attempts = 0

    while add_graph_documents_attempts < max_attempts:
        try:
            graph_db.add_graph_documents(graph_documents)
            break
        except Exception as e:
            add_graph_documents_attempts += 1

    # Retrieve the relevant legal documents from the vector database
    document_names = extract_documents_from_info(info)

    documents = []
    for document_name in document_names:
        ensemble_retriever = create_retriever(vector_db, document_name, top_k)
        documents.extend(retrieve_documents(ensemble_retriever, document_name, top_k))

    seen_titles = set()
    unique_titles = []

    for doc in documents:
        title = doc.metadata.get('title', 'no title')
        
        if title not in seen_titles:
            seen_titles.add(title)
            unique_titles.append(title)

    formatted_docs = format_docs(documents)
    question = \
f"""
Here is the relevant legal documents you should refer to:
{formatted_docs}
Here is the information the user provided to the government service form:
{remove_tags(info)}
"""
    """
    Try using graph database first, if there is any error (in graph database, LLM, or graph database error)
    fallback without using graph database.
    """

    query_from_graphdb_attempts = 0
    while query_from_graphdb_attempts < max_attempts:
        try:
            result = graph_db.invoke(question)
            break
        except Exception as e:
            query_from_graphdb_attempts += 1

    if query_from_graphdb_attempts == max_attempts:
        result = autofill_chain_qa.invoke({"context": formatted_docs, "question": info})

    return result, unique_titles

def check_document_info_validity_without_graphdb(vector_db, info: str, top_k=3):
    """
    Check the validity of the extracted information and documents
    with the law documents retrieved from the vector database.
    """
    # Retrieve the relevant legal documents from the vector database
    document_names = extract_documents_from_info(info)

    documents = []
    for document_name in document_names:
        ensemble_retriever = create_retriever(vector_db, document_name, top_k)
        documents.extend(retrieve_documents(ensemble_retriever, document_name, top_k))

    seen_titles = set()
    unique_titles = []

    for doc in documents:
        title = doc.metadata.get('title', 'no title')
        
        if title not in seen_titles:
            seen_titles.add(title)
            unique_titles.append(title)

    formatted_docs = format_docs(documents)
    output = autofill_chain_qa.invoke({"context": formatted_docs, "question": info})

    return output, unique_titles

async def get_images_and_docs_from_form_files(form_files: List[UploadFile]):
    images = []; docs = []
    for form_file in form_files:
        if form_file.content_type != None and form_file.content_type.find('image') != -1:
            content = await form_file.read()
            images.append(content)
        elif form_file.content_type != None and (form_file.content_type.find('text') != -1 
         or form_file.filename.find('docx') != -1 or form_file.filename.find('pdf') != -1):
            docs = await form_file.read()
            docs.append(content)

    return images, docs

@router.post('/autofill/required_info', response_model=AutofillRequiredInfoResponse)
async def autofill_form(form_files: List[UploadFile], 
                        return_docs: bool = False, 
                        use_gpt: bool = True):
    """
    Get required info (and documents if return_docs is True) for the form images and document files
    """
    images, docs = await get_images_and_docs_from_form_files(form_files)
    docs_text = return_text_from_documents(docs)
    image_text = return_text_from_images(images, use_gpt=use_gpt)
    docs_text.extend(image_text)
    extracted_texts = docs_text

    if return_docs:
        required_info = extract_required_info_and_documents(extracted_texts)
    else:
        required_info = extract_required_info(extracted_texts)

    return AutofillRequiredInfoResponse(answer=required_info)

@router.post('/autofill/match_with_parsed_info', response_model=AutofillResponse)
async def match_documents_with_parsed_required_info(app_request: Request,
                                                    required_info: str = Form(...), 
                                                    required_docs_files: List[UploadFile] | None = Form([]),
                                                    additional_info: str | None = Form(None),
                                                    check_validity: bool = Form(True) ):
    images, docs = await get_images_and_docs_from_form_files(required_docs_files)
    docs_text = return_text_from_documents(docs)
    image_text = return_text_from_images(images)
    docs_text.extend(image_text)
    extracted_texts = docs_text

    match_result = match_required_info(required_info, extracted_texts, additional_info)
    if check_validity == True:
        kuzu_session = app_request.app.state.kuzu_session
        chroma_db = app_request.app.state.chroma_db
        checking_validity_value_text, titles = check_document_info_validity(kuzu_session, chroma_db, match_result)
        return AutofillResponse(answer=match_result, checking_valid_value_text=checking_validity_value_text, titles=titles)
    else:
        return AutofillResponse(answer=match_result, checking_valid_value_text=None, titles=[])
