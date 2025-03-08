import easyocr
import cv2
import os, io
import base64
import numpy as np
from PIL.Image import Image
from langchain_openai import OpenAI, ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from dotenv import load_dotenv
from typing import List

os.environ['EASYOCR_MODULE_PATH'] = '../image_processing/models'

# Initialize the EasyOCR reader
reader = easyocr.Reader(['vi','en'])

import pytesseract
from PIL import Image
import os

# Ensure the Tesseract executable is in the PATH environment variable
if os.name == 'nt':  # For Windows
    os.environ['PATH'] += r';C:\Program Files\Tesseract-OCR'
else:  # For Linux
    os.environ['PATH'] += r':/usr/local/bin'

# Set the TESSDATA_PREFIX environment variable to point to the custom models directory
os.environ['TESSDATA_PREFIX'] = r'./image_processing/models'


# Load environment variables from .env file
load_dotenv()

# Get the OpenAI API key from environment variables
api_key = os.getenv('OPENAI_API_KEY')

# Initialize the OpenAI LLM
llm = ChatOpenAI(api_key=api_key, model='gpt-4o-mini', temperature=0.6)

def image_bytes_to_opencv(image):
    image = Image.open(io.BytesIO(image))
    return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

def image_bytes_to_pil(image):
    return Image.open(io.BytesIO(image))

def image_path_to_bytes(image_path):
    with open(image_path, 'rb') as f:
        return f.read()


# Load the image from file
def read_text_from_image_tesseract(image_bytes_or_path: str | bytes):
    if isinstance(image_bytes_or_path, str): 
        image = Image.open(image_bytes_or_path)
    else:
        image = image_bytes_to_pil(image_bytes_or_path)

    # Extract text from the image
    config = '--psm 6 -l vie+eng'  # Assume a single uniform block of text
    extracted_text = pytesseract.image_to_string(image, config=config)

    return extracted_text

# Load the image
def read_text_from_image_easyocr(image_bytes_or_path: str | bytes):
    if isinstance(image_bytes_or_path, str):
        image = cv2.imread(image_bytes_or_path)
    else:
        image = image_bytes_to_opencv(image_bytes_or_path)

    # Convert the image to HSV
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    # Create a mask to detect darker text (black and dark blue)
    lower_black_blue = np.array([0, 0, 0])
    upper_black_blue = np.array([180, 255, 90])  # Covers black and dark blue
    mask_text = cv2.inRange(hsv, lower_black_blue, upper_black_blue)

    # Invert mask to get non-text areas
    mask_background = cv2.bitwise_not(mask_text)

    # Brighten non-text areas
    image_brightened = cv2.addWeighted(image, 1, np.full_like(image, 100), 0.4, 0)
    image_brightened[mask_text > 0] = image[mask_text > 0]  # Preserve text areas

    # Perform OCR on the image
    results = reader.readtext(image_brightened, detail=0)

    result_text = ' '.join(results)
    return result_text


def correct_id_card_text(easyocr_text):
    prompt = \
f"""
Correct as much spelling and parsing errors as possible in the result text read from Tesseract and OpenOCR respectively(it may have many errors), text originally in Vietnamese and English, return only the corrected text, 
do not add extra information, characters in the result must be valid Vietnamese and English characters:

Text from EasyOCR:
{easyocr_text}
"""
    response = llm.invoke(prompt)
    corrected_text = response.content
    return corrected_text

# Check if the image is complex (contains many colored elements like ID cards and certain certificate) 
# to determine if we should use OCR like EasyOCR or Tesseract for text extraction, or model like OpenAI for text correction
def is_image_complex_doc(image_bytes_or_path, saturation_threshold=40, color_percentage_threshold=30, return_percentage=False):
    # Load the image
    if isinstance(image_bytes_or_path, str):
        image = cv2.imread(image_bytes_or_path)
    else:
        image = image_bytes_to_opencv(image_bytes_or_path)
    
    # Convert to HSV color space
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    
    # Extract Hue, Saturation, and Value channels
    h, s, v = cv2.split(hsv)
    
    # Compute the percentage of pixels with significant saturation (not white/gray)
    colored_pixels = np.sum(s > saturation_threshold)  # Count pixels with saturation > threshold
    total_pixels = s.size  # Total pixels in the image
    
    color_percentage = (colored_pixels / total_pixels) * 100  # Percentage of colored pixels
    
    if return_percentage:
        return color_percentage

    # Decision based on color percentage
    if color_percentage > color_percentage_threshold:
        return True
    else:
        return False

def image_to_base64(image: bytes):
    return base64.b64encode(image).decode('utf-8')

def extract_text_from_image_gpt(image_bytes_or_path: str, image_description: str = ""):
    if isinstance(image_bytes_or_path, str):
        image = Image.open(image_bytes_or_path)
    else:
        image = image_bytes_to_pil(image_bytes_or_path)

    im_file = io.BytesIO()
    image.save(im_file, format="JPEG")
    image_base64 = image_to_base64(im_file.getvalue())
    message = HumanMessage(
        content= [
            {"type": "text", "text": "Extract text from the image, do not add other information."},
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}
            }
        ]
    )
    response = llm.invoke([message])
    return f"{'Description: {}\n'.format(image_description) if image_description else ''}{response.content}"

def return_text_from_images(image_bytes_or_path_list: List[str | bytes], use_gpt: bool = False) -> List[str]:
    image_extracted_text = []
    for image_bytes_or_path in image_bytes_or_path_list:
        if use_gpt or is_image_complex_doc(image_bytes_or_path):
            image_extracted_text.append(extract_text_from_image_gpt(image_bytes_or_path))
        else:
            image_extracted_text.append(read_text_from_image_easyocr(image_bytes_or_path))
    return image_extracted_text
