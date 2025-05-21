
import sys
import os
import PyPDF2

def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file."""
    if not os.path.exists(pdf_path):
        print(f"Error: File {pdf_path} does not exist.", file=sys.stderr)
        sys.exit(1)
    
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            
            for page_num in range(len(reader.pages)):
                page = reader.pages[page_num]
                text += page.extract_text() + "\n\n"
            
            return text
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python pdf_text_extractor.py <pdf_file_path>", file=sys.stderr)
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    text = extract_text_from_pdf(pdf_path)
    print(text)
