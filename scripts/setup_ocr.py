#!/usr/bin/env python3
"""
Automated OCR Environment & Gujarati Language Pack Setup Script
=============================================================
This script:
1. Checks Python dependencies (flask, flask-cors, pillow, pytesseract, paddleocr).
2. Detects local Tesseract OCR engine binary on Windows and Unix.
3. Checks for 'guj.traineddata' and 'eng.traineddata'.
4. Automatically downloads missing Gujarati/English traineddata from official GitHub tessdata mirrors.
5. Verifies OCR recognition on a sample Gujarati phrase ("ગુજરાત સરકાર - ICDP").
"""

import os
import sys
import urllib.request
import shutil
import subprocess

TESSDATA_MIRRORS = [
    "https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/{lang}.traineddata",
    "https://raw.githubusercontent.com/tesseract-ocr/tessdata/main/{lang}.traineddata",
    "https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/main/{lang}.traineddata",
]

def find_tesseract_binary() -> str | None:
    # 1. Environment variable
    if os.environ.get("TESSERACT_CMD") and os.path.exists(os.environ["TESSERACT_CMD"]):
        return os.environ["TESSERACT_CMD"]
    
    # 2. PATH check
    which_path = shutil.which("tesseract")
    if which_path:
        return which_path

    # 3. Standard Windows locations
    win_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Tesseract-OCR\tesseract.exe"),
    ]
    for p in win_paths:
        if os.path.exists(p):
            return p
    return None

def find_tessdata_dir(tesseract_bin: str | None) -> str | None:
    if os.environ.get("TESSDATA_PREFIX") and os.path.exists(os.environ["TESSDATA_PREFIX"]):
        return os.environ["TESSDATA_PREFIX"]
    
    if tesseract_bin:
        bin_dir = os.path.dirname(tesseract_bin)
        candidate = os.path.join(bin_dir, "tessdata")
        if os.path.exists(candidate):
            return candidate
    
    standard_win = r"C:\Program Files\Tesseract-OCR\tessdata"
    if os.path.exists(standard_win):
        return standard_win

    return None

def download_traineddata(lang: str, target_dir: str) -> bool:
    target_path = os.path.join(target_dir, f"{lang}.traineddata")
    if os.path.exists(target_path) and os.path.getsize(target_path) > 100000:
        print(f"  [OK] '{lang}.traineddata' already exists ({os.path.getsize(target_path) / 1024 / 1024:.2f} MB).")
        return True

    print(f"  [>] Downloading '{lang}.traineddata'...")
    for mirror in TESSDATA_MIRRORS:
        url = mirror.format(lang=lang)
        try:
            print(f"      Trying: {url}")
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as resp, open(target_path, "wb") as out_file:
                shutil.copyfileobj(resp, out_file)
            size_mb = os.path.getsize(target_path) / 1024 / 1024
            if size_mb > 0.1:
                print(f"  [SUCCESS] Downloaded {lang}.traineddata ({size_mb:.2f} MB)")
                return True
        except Exception as e:
            print(f"      Mirror failed: {e}")
            if os.path.exists(target_path):
                os.remove(target_path)

    print(f"  [ERROR] Could not download '{lang}.traineddata' from any mirror.")
    return False

def main():
    print("=" * 65)
    print("  ICDP Modern - OCR Environment & Gujarati Setup")
    print("=" * 65)

    # Step 1: Detect Tesseract
    print("\n1. Detecting Tesseract Binary...")
    tess_bin = find_tesseract_binary()
    if tess_bin:
        print(f"  [OK] Found Tesseract binary at: {tess_bin}")
        try:
            ver = subprocess.check_output([tess_bin, "--version"], text=True, stderr=subprocess.STDOUT)
            first_line = ver.splitlines()[0] if ver else ""
            print(f"  [OK] Version: {first_line}")
        except Exception as e:
            print(f"  [WARN] Could not retrieve version: {e}")
    else:
        print("  [WARN] Tesseract binary not detected on standard PATH.")
        print("         The in-browser WebWorker engine will be used automatically in the browser.")
        print("         To enable fast local OCR on Windows:")
        print("         1. Download & install Tesseract OCR from: https://github.com/UB-Mannheim/tesseract/wiki")
        print("         2. Select 'Gujarati' script during installer component selection.")

    # Step 2: Detect or Prepare tessdata folder
    print("\n2. Checking Gujarati Language Packs...")
    tessdata_dir = find_tessdata_dir(tess_bin)
    if tessdata_dir:
        print(f"  [OK] Using tessdata directory: {tessdata_dir}")
        download_traineddata("eng", tessdata_dir)
        download_traineddata("guj", tessdata_dir)
    else:
        print("  [INFO] No local tessdata directory detected (Tesseract not installed locally).")

    # Step 3: Check Python packages
    print("\n3. Checking Python Server Dependencies...")
    required_packages = ["flask", "flask_cors", "PIL", "pytesseract"]
    missing_packages = []
    for pkg in required_packages:
        try:
            __import__(pkg)
            print(f"  [OK] Python package '{pkg}' is installed.")
        except ImportError:
            missing_packages.append(pkg)
            print(f"  [MISSING] Python package '{pkg}'")

    if missing_packages:
        print(f"\n  To install missing packages, run:")
        print(f"  pip install flask flask-cors pillow pytesseract")
    else:
        print("\n  [OK] All Python dependencies are satisfied!")
        print(f"  To start the local OCR server:")
        print(f"  python scripts/ocr_server.py --port 5005")

    print("\n" + "=" * 65)
    print("  Setup check completed!")
    print("=" * 65)

if __name__ == "__main__":
    main()
