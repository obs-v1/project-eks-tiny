FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# --- Observability: traces + metrics pillars ---
# opentelemetry-bootstrap installs auto-instrumentations for the libraries in use (FastAPI, pika,
# httpx, logging). At runtime `opentelemetry-instrument` activates them: traces export over OTLP and
# the LoggingInstrumentor injects trace_id into logs. Metrics come from the Prometheus /metrics
# endpoint (scraped), so OTEL_METRICS_EXPORTER is set to none in the manifest.
RUN opentelemetry-bootstrap -a install
COPY . .
EXPOSE 8005
CMD ["opentelemetry-instrument", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8005"]
