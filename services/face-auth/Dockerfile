FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      libglib2.0-0 libgomp1 && rm -rf /var/lib/apt/lists/*
COPY requirements.txt download_models.py ./
RUN pip install --no-cache-dir -r requirements.txt \
 && python download_models.py            # fetch ONNX models at build (git-ignored)
COPY . .
EXPOSE 3005
# Camera is captured in the browser; biometric data persists via the mounted volume.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "3005"]
