 #Useful in the admin panel to merge files
# Merge two PDF files and save the merged content as a text file. 

import PyPDF2
import os

def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file"""
    text = ""
    with open(pdf_path, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
    return text

# Get file paths from user input
pdf1 = input("Enter path to first PDF file: ").strip().strip('"').strip("'")
pdf2 = input("Enter path to second PDF file: ").strip().strip('"').strip("'")
output_file = input("Enter path for output txt file: ").strip().strip('"').strip("'")

# If output is a directory, append default filename
if os.path.isdir(output_file):
    output_file = os.path.join(output_file, "Ayurvedic_merged.txt")

# Extract text from both PDFs
print(f"Extracting text from {pdf1}...")
text1 = extract_text_from_pdf(pdf1)

print(f"Extracting text from {pdf2}...")
text2 = extract_text_from_pdf(pdf2)

# Merge the texts
merged_text = f"=== FILE 1: {pdf1} ===\n\n{text1}\n\n{'='*50}\n\n=== FILE 2: {pdf2} ===\n\n{text2}"

# Save to txt file
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(merged_text)

print(f"\nDone! Merged content saved to: {output_file}")