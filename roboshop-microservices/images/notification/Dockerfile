FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# --- Observability: traces + metrics pillars (see payment/Dockerfile) ---
RUN opentelemetry-bootstrap -a install
COPY . .
EXPOSE 8008
# gunicorn (prod) instead of `python app.py` (Flask dev server); single worker keeps /metrics consistent.
CMD ["opentelemetry-instrument", "gunicorn", "-b", "0.0.0.0:8008", "-w", "1", "app:app"]
