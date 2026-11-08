# obs.py - observability helpers (logs pillar).
# JSON logs to stdout carrying the OTel trace context. `opentelemetry-instrument` auto-enables the
# LoggingInstrumentor, which injects otelTraceID/otelSpanID onto every LogRecord (set
# OTEL_PYTHON_LOG_CORRELATION=true in the manifest). We rename those to trace_id/span_id so Loki`s
# derived field links each line to its Jaeger trace. Traces (OTLP) and metrics (/metrics scrape)
# are wired separately.
import logging
from pythonjsonlogger import jsonlogger


def setup_json_logging(level=logging.INFO):
    handler = logging.StreamHandler()
    handler.setFormatter(jsonlogger.JsonFormatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s %(otelTraceID)s %(otelSpanID)s",
        rename_fields={"asctime": "timestamp", "levelname": "level", "name": "logger",
                       "otelTraceID": "trace_id", "otelSpanID": "span_id"},
    ))
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)
