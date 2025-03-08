import re
from langchain_core.documents import Document
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableMap, RunnablePassthrough
from langchain_experimental.graph_transformers import LLMGraphTransformer
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_kuzu.graphs.kuzu_graph import KuzuGraph
from langchain_kuzu.chains.graph_qa.kuzu import KuzuQAChain
from handlers_autofill.image_processing import llm, return_text_from_images, api_key
from handlers_autofill.read_document import return_text_from_documents
from typing import List
import kuzu, sys


autofill_system_prompt = """
You are a public service helper named PublicDocGenie. You are here to check information the user filled in in a government service form, with graph data retrieved from a graph database.
Your response must be in Vietnamese and should be as detailed and easy to understand as possible, especially for users who are not familiar with legal terms.
Is the input valid according to the law? Please validate. If the input is not valid, please provide the explanation
and the possible valid values (if applicable, give the user hints to fill in the correct information),
as well as provide clear explanations from the legal documents provided, and examples if necessary.
{prompt}
"""

transformer_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3, api_key=api_key)

llm_transformer = LLMGraphTransformer(
    llm=transformer_llm,
)

autofill_chain_system_prompt = """
You are a public service helper named PublicDocGenie. You are here to check information the user filled in in a government service form, with graph data retrieved from a graph database.
Here is the legal documents you should refer to:
{context}
Your response must be in Vietnamese and should be as detailed and easy to understand as possible, especially for users who are not familiar with legal terms.
Is the input valid according to the law? Please validate. If the input is not valid, please provide the explanation
and the possible valid values (if applicable, give the user hints to fill in the correct information),
as well as provide clear explanations from the legal documents provided, and examples if necessary.
"""

autofill_prompt_template = ChatPromptTemplate.from_messages(
    [("system", autofill_chain_system_prompt), ("human", "User input in government service form: {question}")]
)

autofill_chain_qa = (
    RunnableMap(
        {"context": RunnablePassthrough(), "question": RunnablePassthrough()}
    )
    | autofill_prompt_template
    | llm
    | StrOutputParser()
)

class KuzuSession:
    def __init__(self, user_id: str, graph_db_path: str = ":memory:"):
        self.user_id = user_id
        self.db = kuzu.Database(graph_db_path)
        self.graph_db = KuzuGraph(self.db, allow_dangerous_requests=True)
        
        self.qa_chain = KuzuQAChain.from_llm(
            llm=transformer_llm, graph=self.graph_db, verbose=True,
            allow_dangerous_requests=True,
        )
        

    def get_session(self):
        return self.graph_db
    
    def get_qa_chain(self):
        return self.autofill_chain
    
    def add_graph_documents(self, graph_documents):
        self.graph_db.add_graph_documents(graph_documents)

    def invoke(self, question):
        return self.qa_chain.invoke(autofill_system_prompt.format(prompt=question))['result']
    

extract_required_info_and_doc_prompt = \
"""
From the given images, PDF/DOCX files, and extracted text content (each image's text content is enclosed within <Document> and </Document> tags), identify and return the required documents (e.g., CCCD, business license, etc.) and any additional information necessary to complete the public service forms.

Rules:
1. Do not include signatures.
2. If a document contains necessary information, only return the document name (do not extract specific content from it).
3. Only return Vietnamese documents unless the form explicitly involves foreign elements (e.g., contracts for overseas workers).
4. Documents and required information should be separated by newlines.
5. Each document should be enclosed within <Doc> and </Doc> tags.
6. Each piece of additional required information should be enclosed within <Info> and </Info> tags.
7. All document names and required information must be written in Vietnamese.
8. Information should provide the context in the document (e.g., for a household business registration form, if the form requires to provide the current address, you must specify if the current address is the current address of the household business or the current address of the person making the form).
9. If a document or information is not required or optional, specify it as optional at the end with "(không bắt buộc)".
10. If an information is one choice of multiple options or multiple choices, specify all the options in the information.

Example Output:
<Doc>CCCD</Doc>
<Doc>Giấy phép kinh doanh</Doc>
<Info>Địa chỉ thường trú</Info>
<Info>Số điện thoại liên hệ (không bắt buộc)</Info>
<Info>Loại hình doanh nghiệp (Công ty cổ phần, doanh nghiệp tư nhân)</Info>
"""

extract_required_info_prompt = \
"""
From the given images, PDF/DOCX files, and extracted text content (each image's text content is enclosed within <Document> and </Document> tags), identify and return the required additional information necessary to complete the public service forms.
Rules:
1. Do not include signatures.
2. Only return Vietnamese documents unless the form explicitly involves foreign elements (e.g., contracts for overseas workers).
3. Documents and required information should be separated by newlines.
4. Each piece of additional required information should be enclosed within <Info> and </Info> tags.
5. All required information must be written in Vietnamese.
6. Information should provide the context in the document (e.g., for a household business registration form, if the form requires to provide the current address, you must specify if the current address is the current address of the household business or the current address of the person making the form).
7. If a information is not required or optional, specify it as optional at the end with "(không bắt buộc)".
10. If an information is one choice of multiple options or multiple choices, specify all the options in the information.

Example Output:
<Info>Mã số thuế</Info>
<Info>Mã số giấy phép kinh doanh</Info>
<Info>Địa chỉ thường trú</Info>
<Info>Số điện thoại liên hệ (không bắt buộc)</Info>
<Info>Loại hình doanh nghiệp (Công ty cổ phần, doanh nghiệp tư nhân)</Info>
"""

match_required_info_prompt = \
"""
From the required information to fill a public document (enclosed within each <Info> and </Info> tags),
and the extracted text content the documents needed for the information (each image's text content is enclosed within <Document> and </Document> tags), 
as well as PDF/DOCX files of the documents needed for the information, match the required information with the info in documents (each document is enclosed within each <Document> and </Document> tags).
Return the matched information (enclosed within <Info> and </Info> tags),
with the corresponding value (enclosed within <Value> and </Value> tags), and the document in which each information is found (enclosed within <Doc> and </Doc> tags),
each pair of information, value, and document should be separated by a newline character.
If the information is not found in the documents, do not return it.

Example Output:
<Info>Tên người nộp thuế</Info><Value>NGUYỄN TUẤN KHANH</Value><Doc>CCCD</Doc>
<Info>Địa chỉ thường trú</Info><Value>21, Nguyễn Trãi, Phường An Bình, Thành phố Biên Hòa, Tỉnh Đồng Nai</Value><Doc>CCCD</Doc>
<Info>Email (không bắt buộc)</Info><Value>tuananh217@gmail.com</Value><Doc>Không có</Doc>
<Info>Loại hình doanh nghiệp</Info><Value>Công ty cổ phần</Value><Doc>Giấy phép kinh doanh</Doc>
Wrong Example Output:
<Info>NGUYỄN TUẤN KHANH</Info><Value>Tên người nộp thuế</Value><Doc>CCCD</Doc>
<Info>Giấy phép kinh doanh</Info><Value>Loại hình doanh nghiệp</Value><Doc>Công ty cổ phần</Doc>
"""

def extract_required_info(extracted_text: List[str]) -> str:
    # Combine all extracted text
    extracted_text = '\n'.join(f"<Document>{doc}</Document>" for doc in extracted_text)
    
    messages = [
        SystemMessage(content=extract_required_info_prompt),
        HumanMessage(content=extracted_text)
    ]
    # Extract the required information
    required_info = llm.invoke(messages)
    
    return required_info.content

def extract_required_info_and_documents(extracted_text: List[str]) -> str:
    # Combine all extracted text
    extracted_text = '\n'.join(f"<Document>{doc}</Document>" for doc in extracted_text)
    
    messages = [
        SystemMessage(content=extract_required_info_and_doc_prompt),
        HumanMessage(content=extracted_text)
    ]
    # Extract the required information
    required_info = llm.invoke(messages)
    
    return required_info.content

def match_required_info(required_info: str, extracted_needed_documents_text: List[str], additional_user_info: str = None) -> str:
    # Combine all extracted text
    extracted_text = '\n'.join(f"<Document>{doc}</Document>" for doc in extracted_needed_documents_text)
    extracted_text = extracted_text + '\n' + (f"Additional information: {additional_user_info}" if additional_user_info else '')
    messages = [
        SystemMessage(content=match_required_info_prompt),
        HumanMessage(content=required_info + '\n' + extracted_text),
    ]
    # Match the required information with the extracted text
    matched_info = llm.invoke(messages)
    
    return matched_info.content


def remove_tags(text: str) -> str:
    """
    Remove tags from the info matching text before parsing and adding to the graph database.
    """
    return text.replace("<Info>", "Info: ").replace("</Info>", "").replace("<Value>", ", with value: ").replace("</Value>", "") \
                    .replace("<Doc>", ", from document: ").replace("</Doc>", "")

"""
Graph database for storing the extracted information and documents.
"""


def extract_documents_from_info(info: str) -> List[str]:
    """
    Extract document names from the information matching text.
    """
    # Regex pattern to find text inside <Doc> tags
    pattern = r'<Doc>(.*?)</Doc>'

    # Find all matches
    documents = re.findall(pattern, info, re.DOTALL)   
    
    return list(set(documents))

def info_to_graph_documents(info: str):
    """
    Add the extracted information to the graph database.
    """
    info = remove_tags(info)
    documents = [Document(page_content=info)]
    graph_documents = llm_transformer.convert_to_graph_documents(documents)
    return graph_documents

def save_into_to_graphdb(graph_db: KuzuSession, info: str):
    """
    Save the extracted information to the graph database.
    """
    graph_documents = info_to_graph_documents(info)
    graph_db.add_graph_documents(graph_documents)


