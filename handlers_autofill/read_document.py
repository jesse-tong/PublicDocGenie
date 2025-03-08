from langchain_community.document_loaders import Docx2txtLoader
import pypdf, docx2txt
from typing import List
from io import BytesIO

def read_pdf_text(file: bytes) -> str:
    """
    Read text from a PDF file.
    """
    pdf_stream = BytesIO(file)
    pdf = pypdf.PdfReader(pdf_stream)
    text = '\n'.join([page.extract_text() for page in pdf.pages])
    
    return text

def read_docx_text(file_path: str) -> str:
    """
    Read text from a DOCX file.
    """
    docx_stream = BytesIO(file_path)
    text = docx2txt.process(docx_stream)
    
    return text

def detect_file_type(file_bytes):
    # Check for PDF
    if file_bytes.startswith(b'%PDF-'):
        return 'pdf'
    
    # Check for DOCX (ZIP file with specific structure)
    if file_bytes[:2] == b'\x50\x4b':  # Check for ZIP file signature
        if b'word/' in file_bytes:
            return 'docx'
    
    # Check for TXT (valid UTF-8)
    try:
        file_bytes.decode('utf-8')
        return 'txt'
    except UnicodeDecodeError:
        return 'unknown'
    
def read_document(file: bytes) -> str:
    """
    Read text from a document file.
    """
    file_type = detect_file_type(file)
    
    if file_type == 'pdf':
        return read_pdf_text(file)
    elif file_type == 'docx':
        return read_docx_text(file)
    elif file_type == 'txt':
        return file.decode('utf-8')
    else:
        raise ValueError(f"Unsupported file type: {file_type}")
    
def return_text_from_documents(documents: List[bytes | str]) -> List[str]:
    """
    Read text from a list of document files.
    documents: List of document files (bytes or file paths)
    """
    texts = []
    for doc in documents:
        if type(doc) == str:
            with open(doc, 'rb') as file:
                file_bytes = file.read()
        else:
            file_bytes = doc
    
        text = read_document(file_bytes)
        texts.append(text)
    return texts