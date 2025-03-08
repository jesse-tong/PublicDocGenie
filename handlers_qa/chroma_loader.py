import os
import argparse
from langchain.schema import Document
from langchain_chroma import Chroma
from langchain_community.document_loaders import CSVLoader
from langchain_community.document_loaders.text import TextLoader
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from tqdm import tqdm
import csv
import re
import pandas as pd

def update_metadata(doc: Document):
    # Get the text content of the document
    text = doc.page_content

    metadata = {}

    metadata['luat'] = re.search(r'Luật\s*(\S.+)', text)
    metadata['luat'] = metadata['luat'].group(1) if metadata['luat'] else "N/A"

    metadata['thong_tu'] = re.search(r'Thông tư\s*(\S.+)', text)
    metadata['thong_tu'] = metadata['thong_tu'].group(1) if metadata['thong_tu'] else "N/A"

    metadata['nghi_dinh'] = re.search(r'Nghị định\s*(\S.+)', text)
    metadata['nghi_dinh'] = metadata['nghi_dinh'].group(1) if metadata['nghi_dinh'] else "N/A"

    metadata['can_cu'] = re.findall(r'Căn cứ\s*(.*?)(?=\n)', text)
    metadata['can_cu'] = ', '.join(metadata['can_cu']) if metadata['can_cu'] else "N/A"

    if metadata['luat'] != "N/A":
        metadata['title'] = 'Luật ' + metadata['luat']
    elif metadata['thong_tu'] != "N/A":
        metadata['title'] = 'Thông tư ' + metadata['thong_tu']
    elif metadata['nghi_dinh'] != "N/A":
        metadata['title'] = 'Nghị định ' + metadata['nghi_dinh']
    else:
        metadata['title'] = "N/A"

    # Update the metadata in the document
    doc.metadata.update(metadata)

    return doc

def load_data(file_path: str):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"The file '{file_path}' does not exist.")
    
    csv.field_size_limit(10**6)
    loader = TextLoader(file_path, encoding="utf-8")
    
    try:
        documents = loader.load()
    except Exception as e:
        raise ValueError(f"Failed to load text file '{file_path}': {e}")
    
    updated_documents = [update_metadata(doc) for doc in tqdm(documents)]
    
    return updated_documents

def load_all_text_files_in_directory(directory: str):
    if not os.path.exists(directory):
        raise FileNotFoundError(f"The directory '{directory}' does not exist.")
    
    text_files = [os.path.join(directory, file) for file in os.listdir(directory) if file.endswith('.xml') or file.endswith('.txt')]
    
    all_documents = []
    for text_file in text_files:
        all_documents.extend(load_data(text_file))
    
    return all_documents

def create_chroma_db(documents, persist_dir, batch_size=50):
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )
    text_splitter = RecursiveCharacterTextSplitter()
    vector_db = Chroma(
        embedding_function=embeddings,
        persist_directory=persist_dir
    )
    for i in tqdm(range(0, len(documents), batch_size)):
        batch = documents[i:i+batch_size]
        batch = text_splitter.split_documents(batch)
        vector_db.add_documents(batch)

        print(f"Persisted batch {i//batch_size + 1}")
    
    print(f"Database persisted to {persist_dir}")

    return vector_db

def load_chroma_db(persist_dir):
    if not os.path.exists(persist_dir):
        raise FileNotFoundError(f"The directory '{persist_dir}' does not exist.")
    
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    vector_db = Chroma(
        embedding_function=embeddings,
        persist_directory=persist_dir
    )

    return vector_db

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a Chroma database from a directory of text files")
    parser.add_argument("text_directory", type=str, help="The directory containing the text files")
    parser.add_argument("persist_dir", type=str, help="The directory to persist the Chroma database")
    args = parser.parse_args()

    try:
        documents = load_all_text_files_in_directory(args.text_directory)
        create_chroma_db(documents, args.persist_dir)

        load_chroma_db(args.persist_dir)
    except Exception as e:
        print(f"Error: {e}")