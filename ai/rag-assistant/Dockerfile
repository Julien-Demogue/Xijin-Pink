FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY rag ./rag
COPY service.py build_index.py ask.py ./
EXPOSE 3020
# Corpus (docs/) mounted at /app/docs; the index is built on first start if
# absent. Ollama runs on the host (OLLAMA_URL=http://host.docker.internal:11434).
ENV RAG_CORPUS_DIR=/app/docs
CMD ["uvicorn", "service:app", "--host", "0.0.0.0", "--port", "3020"]
