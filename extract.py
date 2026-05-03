import zipfile
import xml.etree.ElementTree as ET
import os

def extract_docx(filepath):
    try:
        with zipfile.ZipFile(filepath) as zf:
            xml_content = zf.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            texts = [node.text for node in tree.findall('.//w:t', namespaces) if node.text]
            return ' '.join(texts)
    except Exception as e:
        return str(e)

def extract_xlsx(filepath):
    try:
        with zipfile.ZipFile(filepath) as zf:
            strings = []
            if 'xl/sharedStrings.xml' in zf.namelist():
                xml_content = zf.read('xl/sharedStrings.xml')
                tree = ET.fromstring(xml_content)
                namespaces = {'x': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                strings = [node.text for node in tree.findall('.//x:t', namespaces) if node.text]
            return ' '.join(strings)
    except Exception as e:
        return str(e)

files = [
    "(8D91-ITP-603) Inlet Structure - Overflow Primary Slab (ID 63975).xlsx",
    "(8D91-ITP-604) Inlet Structure - Overflow Topping Slab (ID 63982).xlsx",
    "(8D91-ITP-611) Inlet Structure - Roof Slabs (ID 63985).xlsx",
    "(8D91-ITP-614) Structural Steel Installation (ID 70375).xlsx",
    "CFA Piles ITP (ID 48417).xlsx",
    "ITP-001 Diaphragm Wall.docx"
]

for f in files:
    if not os.path.exists(f): continue
    print(f"--- {f} ---")
    if f.endswith('.docx'):
        print(extract_docx(f)[:1000]) # Print first 1000 chars for summary
    elif f.endswith('.xlsx'):
        print(extract_xlsx(f)[:1000])

