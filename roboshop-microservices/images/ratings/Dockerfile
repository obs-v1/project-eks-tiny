FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# --- Observability: traces + metrics pillars (see payment/Dockerfile) ---
RUN opentelemetry-bootstrap -a install
COPY . .
EXPOSE 8006
CMD ["opentelemetry-instrument", "gunicorn", "-b", "0.0.0.0:8006", "-w", "1", "app:app"]
