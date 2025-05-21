
import sys
import os
from pdfminer.high_level import extract_text

def extract_text_from_pdf(pdf_path, output_path=None):
    """
    Extract text from a PDF file using pdfminer
    """
    try:
        text = extract_text(pdf_path)
        
        if output_path:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(text)
            return output_path
        else:
            return text
    except Exception as e:
        print(f"Error extracting text from PDF: {e}", file=sys.stderr)
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python pdf_extractor.py [pdf_path] [output_path (optional)]", file=sys.stderr)
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    result = extract_text_from_pdf(pdf_path, output_path)
    if not output_path:
        print(result)
    