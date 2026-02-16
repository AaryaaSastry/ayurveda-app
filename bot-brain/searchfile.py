#!/usr/bin/env python3
'''
Search for a term in a text file.

Usage: python search_file.py <search_term> [file_path]

Examples:
    python search_file.py sciatica
    python search_file.py fever "Downloads/Ayurvedic_merged.txt"
'''

import sys
import os

def search_file(search_term, file_path=None):
    """Search for a term in a text file and print matching lines with line numbers."""
    
    if file_path is None:
        # Default to Ayurvedic_merged.txt in Downloads
        downloads = os.path.join(os.path.expanduser("~"), "Downloads")
        file_path = os.path.join(downloads, "Ayurvedic_merged.txt")
    
    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}")
        return 0
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        search_term_lower = search_term.lower()
        matches = []
        
        for line_num, line in enumerate(lines, 1):
            if search_term_lower in line.lower():
                matches.append((line_num, line.rstrip()))
        
        print(f"Searching for '{search_term}' in '{file_path}'...")
        print("=" * 60)
        
        if matches:
            for line_num, line in matches:
                print(f"{line_num}: {line}")
            print("=" * 60)
            print(f"Found {len(matches)} match(es).")
        else:
            print("No matches found.")
            print("=" * 60)
        
        return len(matches)
    
    except Exception as e:
        print(f"Error reading file: {e}")
        return 0

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        print("Usage: python search_file.py <search_term> [file_path]")
        sys.exit(1)
    
    search_term = sys.argv[1]
    file_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    search_file(search_term, file_path)
