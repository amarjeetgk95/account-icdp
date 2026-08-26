#!/usr/bin/env python3
"""
Local OCR server for the ICDP document workbench.

PaddleOCR is used for English detection/recognition. Gujarati and mixed
Gujarati-English pages are routed to Tesseract when the Gujarati traineddata
pack is installed. PaddleOCR's standard PP-OCR models do not provide a
Gujarati language model, so silently mapping Gujarati to English is avoided.

Usage:
  pip install "paddlepaddle<=2.6" "paddleocr<3.0" flask flask-cors pillow numpy pytesseract
  python scripts/ocr_server.py --port 5005

Tesseract must also be installed and available on PATH with eng.traineddata
and guj.traineddata for Gujarati or mixed-language OCR.
"""

import argparse
import base64
import io
import logging
import os
import sys
import threading
from typing import Any

from PIL import Image

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

try:
    from flask import Flask, jsonify, request
    from flask_cors import CORS
except ImportError:
    print('Error: Missing Flask or flask-cors. Install via: pip install flask flask-cors')
    sys.exit(1)

app = Flask(__name__)
CORS(app)

ocr_instances: dict[str, Any] = {}
ocr_locks: dict[str, threading.Lock] = {}


def get_ocr(lang: str = 'en') -> Any:
    """Create the PaddleOCR instance once per language."""
    if lang not in ocr_instances:
        try:
            from paddleocr import PaddleOCR

            logging.info("Initializing PaddleOCR for language '%s'...", lang)
            # This is the PaddleOCR 2.x/PP-OCRv4 API used by the local server.
            ocr_instances[lang] = PaddleOCR(use_angle_cls=True, lang=lang, show_log=False)
            ocr_locks[lang] = threading.Lock()
            logging.info("PaddleOCR initialized successfully for '%s'.", lang)
        except Exception as error:
            logging.exception("Failed to load PaddleOCR: %s", error)
            ocr_instances[lang] = None
    return ocr_instances[lang]


def get_tesseract_languages() -> set[str]:
    """Return installed Tesseract language packs, or an empty set."""
    try:
        pytesseract = get_tesseract()

        return set(pytesseract.get_languages(config=''))
    except Exception as error:
        logging.info('Tesseract is unavailable: %s', error)
        return set()


def get_tesseract() -> Any:
    """Load pytesseract and support the standard Windows install path."""
    import pytesseract

    configured_path = os.environ.get('TESSERACT_CMD')
    if configured_path:
        pytesseract.pytesseract.tesseract_cmd = configured_path
    elif sys.platform.startswith('win'):
        default_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        if os.path.exists(default_path):
            pytesseract.pytesseract.tesseract_cmd = default_path

    return pytesseract


def normalize_language(language: str) -> str:
    aliases = {
        'en': 'eng',
        'english': 'eng',
        'gu': 'guj',
        'gujarati': 'guj',
        'hi': 'hin',
        'hindi': 'hin',
    }
    normalized = language.strip().lower().replace(' ', '')
    if normalized in ('eng+guj', 'guj+eng'):
        return 'eng+guj'
    if normalized in ('eng+hin', 'hin+eng'):
        return 'eng+hin'
    return aliases.get(normalized, normalized)


def supported_languages() -> list[str]:
    installed = get_tesseract_languages()
    languages: list[str] = []
    if paddle_available() or 'eng' in installed:
        languages.append('eng')
    if 'guj' in installed:
        languages.extend(['guj', 'eng+guj'])
    if 'hin' in installed:
        languages.extend(['hin', 'eng+hin'])
    return languages


def paddle_results(image: Image.Image) -> list[dict[str, Any]]:
    """Run the English PaddleOCR pipeline and normalize its response."""
    import numpy as np

    ocr = get_ocr('en')
    if ocr is None:
        raise RuntimeError('PaddleOCR is not installed or failed to initialize.')

    with ocr_locks.setdefault('en', threading.Lock()):
        raw_results = ocr.ocr(np.array(image), cls=True)

    results: list[dict[str, Any]] = []
    if raw_results and len(raw_results) > 0 and raw_results[0]:
        for line in raw_results[0]:
            box = line[0]
            text_confidence = line[1]
            text = str(text_confidence[0]).strip()
            if not text:
                continue

            results.append({
                'text': text,
                'confidence': round(float(text_confidence[1]), 4),
                'box': box,
                'source': 'paddle',
                'language': 'eng',
            })

    return results


def tesseract_results(image: Image.Image, language: str) -> list[dict[str, Any]]:
    """Run Tesseract with word boxes for Gujarati or mixed-script pages."""
    pytesseract = get_tesseract()
    from pytesseract import Output

    tesseract_language = language
    installed = get_tesseract_languages()
    required = set(tesseract_language.split('+'))
    missing = sorted(required - installed)
    if missing:
        raise RuntimeError(
            'Tesseract language pack(s) missing: '
            + ', '.join(missing)
            + '. Install eng.traineddata/guj.traineddata and retry.'
        )

    data = pytesseract.image_to_data(
        image,
        lang=tesseract_language,
        config='--oem 1 --psm 3',
        output_type=Output.DICT,
    )
    results: list[dict[str, Any]] = []

    for index, raw_text in enumerate(data.get('text', [])):
        text = str(raw_text).strip()
        if not text:
            continue

        try:
            confidence = float(data['conf'][index])
            x = int(data['left'][index])
            y = int(data['top'][index])
            width = int(data['width'][index])
            height = int(data['height'][index])
        except (KeyError, TypeError, ValueError, IndexError):
            continue

        if confidence < 0:
            continue

        results.append({
            'text': text,
            'confidence': round(max(0.0, min(100.0, confidence)), 2),
            'box': [[x, y], [x + width, y], [x + width, y + height], [x, y + height]],
            'bbox': [x, y, x + width, y + height],
            'source': 'tesseract',
            'language': language,
        })

    return results


def paddle_available() -> bool:
    try:
        import paddleocr  # noqa: F401

        return True
    except Exception:
        return False


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'api_version': 2,
        'engine': 'Local OCR Server (PaddleOCR + Tesseract)',
        'version': '2.0.0',
        'paddle_available': paddle_available(),
        'tesseract_languages': sorted(get_tesseract_languages()),
        'supported_languages': supported_languages(),
        'default_port': 5005,
    })


@app.route('/ocr', methods=['POST'])
def process_ocr():
    try:
        data = request.get_json(force=True)
        if not data or 'image' not in data:
            return jsonify({'error': "Missing 'image' field (base64 data URL)"}), 400

        requested_language = normalize_language(str(data.get('language', 'eng+guj')))
        supported = supported_languages()
        if requested_language not in supported:
            return jsonify({
                'error': (
                    f"Language '{requested_language}' is unavailable. "
                    f'Available local languages: {", ".join(supported)}.'
                ),
                'results': [],
            }), 422

        image_b64 = str(data['image'])
        if ',' in image_b64:
            image_b64 = image_b64.split(',', 1)[1]

        image_bytes = base64.b64decode(image_b64, validate=True)
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        width, height = image.size

        # PaddleOCR's standard models do not recognize Gujarati. Use the
        # installed Gujarati Tesseract model instead of returning English text.
        if requested_language in ('guj', 'eng+guj', 'hin', 'eng+hin'):
            results = tesseract_results(image, requested_language)
            engine = 'Tesseract 5 Local'
        else:
            try:
                results = paddle_results(image)
                engine = 'PaddleOCR English Local'
            except Exception as paddle_error:
                logging.warning('PaddleOCR failed; trying Tesseract English fallback: %s', paddle_error)
                if 'eng' not in get_tesseract_languages():
                    raise
                results = tesseract_results(image, 'eng')
                engine = 'Tesseract 5 English Fallback'

        return jsonify({
            'page': data.get('page', 1),
            'width': width,
            'height': height,
            'language': requested_language,
            'engine': engine,
            'results': results,
            'count': len(results),
        })

    except Exception as error:
        logging.exception('OCR Processing Error')
        return jsonify({'error': str(error), 'results': []}), 500


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Local OCR server for ICDP')
    parser.add_argument('--port', type=int, default=5005, help='Port to run OCR server on')
    args = parser.parse_args()

    logging.info('Starting Local OCR Server on http://localhost:%s', args.port)
    # OCR input is sensitive government document data; keep the optional
    # local service off the network unless the operator changes this setting.
    app.run(host='127.0.0.1', port=args.port, debug=False, threaded=True)
