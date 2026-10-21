"""Fetch the two ONNX models into models/ (git-ignored). Run once after clone:

    python download_models.py
"""

import os
import urllib.request

BASE = "https://github.com/opencv/opencv_zoo/raw/main/models"
FILES = {
    "face_detection_yunet_2023mar.onnx": f"{BASE}/face_detection_yunet/face_detection_yunet_2023mar.onnx",
    "face_recognition_sface_2021dec.onnx": f"{BASE}/face_recognition_sface/face_recognition_sface_2021dec.onnx",
}
DEST = os.path.join(os.path.dirname(__file__), "models")


def main():
    os.makedirs(DEST, exist_ok=True)
    for name, url in FILES.items():
        out = os.path.join(DEST, name)
        if os.path.exists(out) and os.path.getsize(out) > 1000:
            print(f"ok  {name}")
            continue
        print(f"... {name}")
        urllib.request.urlretrieve(url, out)
        print(f"got {name} ({os.path.getsize(out)//1024} KB)")


if __name__ == "__main__":
    main()
