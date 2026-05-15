# DocForge - AI Document Generation System

## About The Project

**DocForge** is an AI-powered document generation and processing system designed to streamline trade operations. Dealing with complex trade confirmations (like FX Non-Deliverable Forwards and Interest Rate Swaps) often involves tedious manual data entry, classification, and validation from unstructured email text. 

DocForge automates this entire workflow by leveraging **Google Gemini AI** and **LangGraph** agentic pipelines to:
1. **Intelligently Classify** incoming trade emails to determine the contract type.
2. **Extract Key Trade Data** seamlessly into structured JSON format.
3. **Generate High-Quality PDFs** using a highly precise LaTeX (`pdflatex`) compiling engine.
4. **Validate Generated Documents** automatically against original source text using Gemini's multi-modal capabilities.

### What the Current Prototype Can Do

Currently, the prototype is capable of handling the following workflows through a user-friendly frontend UI:
- **FX NDF Confirmations:** Classifies, extracts data, and compiles trade confirmations for FX Non-Deliverable Forwards.
- **IRS Confirmations:** Handes more complex Interest Rate Swaps, including dynamic sections based on termination types and exhibit selections.
- **PDF Generation & Conversion:** Compiles professional PDF confirmations dynamically from LaTeX templates and supports converting generated PDFs into Microsoft Word (`.docx`) format instantly.
- **AI Validation:** Automatically compares the final generated PDF with the initially pasted email chain to verify that no discrepancies exist in the extracted data.

---

## Architecture Overview

The project follows a modular, agent-driven architecture:
*   **Presentation Layer:** A vanilla HTML/JS/CSS frontend.
*   **API Layer:** A Flask REST API server (`server.py`).
*   **Orchestration Layer:** A LangGraph pipeline (`agents/graph.py`) orchestrating multiple specialized AI agents (Classifier, Extractor, Validator, PDF generation).
*   **Template Engine:** Uses `Jinja2` to dynamically populate LaTeX `.tex` files.
*   **External Integrations:** Google Gemini 2.5 Flash for AI inference, MiKTeX (`pdflatex.exe`) for PDF compilation.

---

## Prerequisites & Setup

### 1. Python Environment
Make sure you have **Python 3.9+** installed on your system.

### 2. Install MiKTeX (For LaTeX Compilation)
The system relies on `pdflatex` to generate the PDF documents. You must install a LaTeX distribution. On Windows, **MiKTeX** is recommended.

1. Download MiKTeX from: [https://miktex.org/download](https://miktex.org/download)
2. Run the installer. 
3. *Crucial:* During installation, when asked "Install missing packages on-the-fly", select **"Yes"**. The templates use several packages (`geometry`, `longtable`, `fancyhdr`, `enumitem`) which MiKTeX will download automatically on the first run.

### 3. Finding and Updating your `pdflatex.exe` Path
Depending on your MiKTeX installation, the path to `pdflatex.exe` will vary. You **must update** this path in the project source code.

**How to find it on Windows:**
1. Open Command Prompt or PowerShell.
2. Type `where pdflatex` and press Enter. 
3. Copy the output file path (e.g., `C:\Users\YourName\AppData\Local\Programs\MiKTeX\miktex\bin\x64\pdflatex.exe`).

**Where to replace it in the code:**
You need to update the `PDFLATEX` variable in two files:
*   `templates/FX_Trade_Confirmation/generate_fx_ndf.py` (around line 26)
*   `templates/IRS_Confirmation/generate_irs.py` (around line 25)

Example:
```python
# Change this line in both files to match YOUR path:
PDFLATEX = r"C:\Your\Actual\Path\To\pdflatex.exe"
```

---

## Installation Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sanjay-r123/TradeDocAI.git
   cd TradeDocAI
   ```

2. **(Optional but recommended) Create a virtual environment:**
   ```bash
   python -m venv venv
   # Activate on Windows:
   venv\Scripts\activate
   # Activate on Mac/Linux:
   source venv/bin/activate
   ```

3. **Install Python dependencies:**
   Ensure you are in the project root directory where `requirements.txt` is located.
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure your Gemini API Key:**
   *   Copy the `.env.example` file and rename it to `.env`.
   *   Open the `.env` file and replace the placeholder text with your actual Gemini API Key from Google AI Studio.
   *   *Note: Your `.env` file is safely ignored by Git and won't be pushed to GitHub.*

---

## Running the Application

1. **Start the server:**
   Ensure your virtual environment is active (if you used one) and run:
   ```bash
   python server.py
   ```
   The Flask API will start running on `http://localhost:5000`.

2. **Open the UI:**
   Navigate to the `ui/` folder in your file explorer and simply double-click `index.html` to open it in your web browser. 

You can now paste a sample trade email and use the system!
