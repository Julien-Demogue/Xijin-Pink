"""Lightweight face recognition — OpenCV YuNet (detection) + SFace (embedding).

CPU-only, two small ONNX models, no dlib/compiler. Used for 1:1 *verification*:
confirm the live frame matches the face enrolled for the entered identifier
(Consigne Additionnelle 1), not open-set identification.
"""

from __future__ import annotations

import base64
import os

import cv2
import numpy as np

# SFace: cosine similarity >= 0.363 means "same identity" (OpenCV reference).
COSINE_THRESHOLD = float(os.environ.get("FACE_COSINE_THRESHOLD", "0.363"))
_MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")


class NoFaceError(Exception):
    """Raised when no face is detected in the image."""


class FaceRecognizer:
    def __init__(self, model_dir: str = _MODEL_DIR):
        self.detector = cv2.FaceDetectorYN.create(
            os.path.join(model_dir, "face_detection_yunet_2023mar.onnx"),
            "", (320, 320), score_threshold=0.8,
        )
        self.recognizer = cv2.FaceRecognizerSF.create(
            os.path.join(model_dir, "face_recognition_sface_2021dec.onnx"), "",
        )

    def _largest_face(self, image: np.ndarray):
        h, w = image.shape[:2]
        self.detector.setInputSize((w, h))
        _, faces = self.detector.detect(image)
        if faces is None or len(faces) == 0:
            return None
        areas = faces[:, 2] * faces[:, 3]
        return faces[int(np.argmax(areas))]

    def embedding(self, image: np.ndarray) -> np.ndarray:
        """Aligned-crop + 128-d SFace feature of the largest face. Raises NoFaceError."""
        face = self._largest_face(image)
        if face is None:
            raise NoFaceError("no face detected")
        aligned = self.recognizer.alignCrop(image, face)
        feat = self.recognizer.feature(aligned)
        return feat.flatten().astype(np.float32)

    @staticmethod
    def cosine(a, b) -> float:
        a = np.asarray(a, dtype=np.float32)
        b = np.asarray(b, dtype=np.float32)
        denom = (np.linalg.norm(a) * np.linalg.norm(b)) + 1e-9
        return float(np.dot(a, b) / denom)

    def verify(self, emb: np.ndarray, enrolled: list) -> tuple[bool, float]:
        """1:1 check against a user's enrolled embeddings. Returns (is_match, best_score)."""
        if not enrolled:
            return False, 0.0
        best = max(self.cosine(emb, np.asarray(e, dtype=np.float32)) for e in enrolled)
        return best >= COSINE_THRESHOLD, best


def decode_image(data: str) -> np.ndarray:
    """Decode a base64 image (optionally a data URL) into a BGR ndarray."""
    if "," in data and data.strip().startswith("data:"):
        data = data.split(",", 1)[1]
    raw = base64.b64decode(data)
    arr = np.frombuffer(raw, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("could not decode image")
    return image
