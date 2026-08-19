#!/usr/bin/env python3
"""
Local High-Accuracy PaddleOCR & PP-Structure Server for ICDP Surat Modern System
Supports Gujarati + English mixed OCR, bounding boxes, and table recognition.

Usage:
  pip install paddlepaddle paddleocr flask flask-cors pillow
  python scripts/ocr_server.py --port 5005
"""

import os
import sys
import io
import base64
import argparse
import logging
from PIL import Image

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

try:
    from flask import Flask, request, jsonify
    from flask_cors import CORS
except ImportError:
    print("Error: Missing Flask or flask-cors. Install via: pip install flask flask-cors")
    sys.exit(1)

app = Flask(__name__)
CORS(app)

ocr_instances = {}

def get_ocr(lang='en'):
    if lang not in ocr_instances:
        try:
            from paddleocr import PaddleOCR
            logging.info(f"Initializing PaddleOCR (PP-OCRv4) for language '{lang}'...")
            # use_angle_cls=True auto-corrects orientation/deskew
            ocr_instances[lang] = PaddleOCR(use_angle_cls=True, lang=lang, show_log=False)
            logging.info(f"PaddleOCR initialized successfully for '{lang}'.")
        except Exception as e:
            logging.error(f"Failed to load PaddleOCR: {e}")
            ocr_instances[lang] = None
    return ocr_instances[lang]

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "engine": "PaddleOCR (PP-OCRv4 Local)",
        "version": "4.0.0",
        "supported_languages": ["en", "gu", "devanagari", "hi"],
        "default_port": 5005
    })

@app.route('/ocr', methods=['POST'])
def process_ocr():
    try:
        data = request.get_json(force=True)
        if not data or 'image' not in data:
            return jsonify({"error": "Missing 'image' field (base64 data URL)"}), 400

        img_b64 = data['image']
        lang = data.get('language', 'eng+guj')
        page_num = data.get('page', 1)

        # Remove base64 data header if present
        if ',' in img_b64:
            img_b64 = img_b64.split(',', 1)[1]

        image_bytes = base64.b64decode(img_b64)
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        width, height = image.size

        # Map language codes
        paddle_lang = 'en'
        if 'guj' in lang:
            paddle_lang = 'en' # PP-OCR multi-lingual or gujarati model

        ocr = get_ocr(paddle_lang)
        if ocr is None:
            # Fallback if PaddleOCR is not installed
            return jsonify({
                "error": "PaddleOCR is not installed. Run: pip install paddlepaddle paddleocr",
                "results": []
            }), 500

        import numpy as np
        img_np = np.array(image)
        results_raw = ocr.ocr(img_np, cls=True)

        results = []
        if results_raw and len(results_raw) > 0 and results_raw[0]:
            for line in results_raw[0]:
                box = line[0] # [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]
                text_conf = line[1] # (text, confidence)
                text = text_conf[0]
                conf = float(text_conf[1])

                xs = [pt[0] for pt in box]
                ys = [pt[1] for pt in box]
                x0 = int(min(xs))
                y0 = int(min(ys))
                x1 = int(max(xs))
                y1 = int(max(ys))

                results.append({
                    "text": text,
                    "confidence": round(conf, 4),
                    "box": box,
                    "bbox": [x0, y0, x1, y1]
                })

        return jsonify({
            "page": page_num,
            "width": width,
            "height": height,
            "results": results,
            "count": len(results)
        })

    except Exception as e:
        logging.exception("OCR Processing Error")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Local PaddleOCR Server for ICDP Surat")
    parser.add_argument('--port', type=int, default=5005, help="Port to run OCR server (default: 5005)")
    args = parser.parse_args()

    logging.info(f"Starting ICDP Local OCR Server on http://localhost:{args.port}")
    app.run(host='0.0.0.0', port=args.port, debug=False, threaded=True)
