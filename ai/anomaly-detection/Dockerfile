FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY detector ./detector
COPY live_scorer.py .
EXPOSE 3010
# Model artifacts (model_store/) are mounted at runtime (trained by train_eval).
CMD ["uvicorn", "live_scorer:app", "--host", "0.0.0.0", "--port", "3010"]
