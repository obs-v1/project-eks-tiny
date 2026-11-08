FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
# --- Observability: traces pillar ---
# Preload the OTel auto-instrumentation register hook: it instruments express + the DB client + http
# and exports spans over OTLP (driven by OTEL_* env in the manifest), and injects trace_id/span_id
# into pino logs. Metrics come from /metrics (express-prom-bundle); logs are JSON on stdout.
ENV NODE_OPTIONS="--require @opentelemetry/auto-instrumentations-node/register"
EXPOSE 8001
CMD ["node", "server.js"]
