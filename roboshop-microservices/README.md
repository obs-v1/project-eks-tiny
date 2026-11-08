# RoboShop Microservices on EKS — observed app (round-2)

The round-2 observed application for `project-eks-tiny`: the full **RoboShop microservices** app
(9 services across 5 languages + 4 datastores) deployed to the app cluster **`obs-v1-bankobs`** in
namespace **`roboshop`**, fully instrumented so every request shows up as **traces + metrics + logs**
in the observability cluster.

```
browser ──▶ frontend (Next + nginx gateway) ──┬─▶ catalogue (Go)   ─▶ MySQL
                                               ├─▶ user (Node)      ─▶ MongoDB
                                               ├─▶ cart (Node)      ─▶ Valkey   (+ calls catalogue)
                                               ├─▶ shipping (Java)  ─▶ MySQL
                                               ├─▶ ratings (Python) ─▶ MySQL
                                               └─▶ payment (Python) ─▶ RabbitMQ ─▶ orders (Java) ─▶ MongoDB
                                                      (validates user, reads cart)      └─▶ shipping + notification (Python)
```

## Observability model (same standard as the monolith)

| Pillar  | How it flows | Per language |
|---------|--------------|--------------|
| **Traces**  | OTLP push → `otel-collector.obs.internal:4317` | Java agent · Node auto-instrument · Python `opentelemetry-instrument` · Go OTel SDK |
| **Metrics** | `/metrics` (or `/actuator/prometheus`) scraped by the node agent (pod `prometheus.io/scrape` annotations) | micrometer · express-prom-bundle · prometheus-{fastapi,flask} · prom client_golang |
| **Logs**    | JSON to stdout, tailed by the node agent → Loki (carry `trace_id`/`span_id`) | logback · pino · python-json-logger · slog |

| Service | Lang | Port | Store | Metrics path |
|---------|------|------|-------|--------------|
| frontend | Next/nginx | 80 | — | (gateway; JSON access logs) |
| user | Node | 8001 | MongoDB | /metrics |
| catalogue | Go | 8002 | MySQL | /metrics |
| cart | Node | 8003 | Valkey | /metrics |
| shipping | Java | 8004 | MySQL (`cities`) | /actuator/prometheus |
| payment | Python | 8005 | RabbitMQ | /metrics |
| ratings | Python | 8006 | MySQL | /metrics |
| orders | Java | 8007 | MongoDB + RabbitMQ | /actuator/prometheus |
| notification | Python | 8008 | RabbitMQ | /metrics |

---

## Prerequisites (once)

1. **Clusters + obs stack up** — bring up the parent lab first (from `project-eks-tiny/`):
   ```
   make up ZONE_ID=<zone> DOMAIN=raghudevopsb88.online ACM_ARN=<acm-arn>
   ```
   That gives you the 2 EKS clusters, the obs stack (Collector, Prometheus, Loki, Jaeger, Grafana),
   the node agent, Traefik + external-dns + ACM.
2. **Docker on your Mac** (the only Docker host) — images build here and push to **public ECR**.
3. **Public ECR repos** exist (world-pullable, so the cluster needs no creds):
   `roboshop-v3/{catalogue,user,cart,shipping,payment,ratings,orders,notification,frontend}`.
   Create any missing one:
   ```
   aws ecr-public create-repository --repository-name roboshop-v3/<svc> --region us-east-1
   ```

> **Note** `make build` pushes to **public** ECR — a public-surface action. Run it yourself (or grant
> the agent a permission rule); it is not done automatically.

---

## Run it

All commands are run from `project-eks-tiny/roboshop-microservices/`.

### 1. Build + push the 9 images (on your Mac — has Docker)
```
make build                      # buildx --platform linux/amd64, pushes :1.0.0 to public ECR
# one service only:  make build-one S=catalogue
```

### 2. Deploy to the cluster (on the workstation — has kubectl contexts)
```
make deploy DOMAIN=raghudevopsb88.online
```
This applies the datastores (MySQL seeds catalogue/ratings/cities, MongoDB, Valkey, RabbitMQ),
the 9 services, and the ingress `roboshop.<DOMAIN>`. Watch them come up:
```
kubectl -n roboshop get pods -w
```

### 3. Generate end-to-end traffic (the trace demo)
```
make load                       # 5 virtual shoppers walking browse→register→cart→checkout→orders
make load VUS=15 DURATION=1h    # heavier / time-boxed
make load LOAD_BASE=https://roboshop.raghudevopsb88.online   # drive the PUBLIC url instead
make load-stop                  # stop
kubectl -n roboshop logs -f deploy/loadgen                   # watch k6
```
Each iteration drives a real checkout, so you get a single **6-service distributed trace**:
`payment → user → cart → [RabbitMQ] → orders → shipping → notification`.

### 4. See the three pillars
| UI | URL | Try |
|----|-----|-----|
| App | https://roboshop.raghudevopsb88.online | browse, add to cart, checkout |
| **Jaeger** (traces) | https://jaeger.raghudevopsb88.online/search | service `payment` → open a trace → 6-service waterfall |
| **Prometheus** (metrics) | https://prometheus.raghudevopsb88.online | `http_request_duration_seconds_count{namespace="roboshop"}` |
| **Grafana** | https://grafana.raghudevopsb88.online | dashboards; Loki `{namespace="roboshop"}` for logs |

### 5. Tear down (keeps the namespace)
```
make destroy
```

Run `make help` for the full target list.

---

## Notes & gotchas (learned the hard way)

- **imagePullPolicy: Always** — this lab re-pushes the same `:1.0.0` tag, and `IfNotPresent` serves a
  stale cached image on the node. All services use `Always`.
- **Python images** pin `setuptools==75.6.0` — newer setuptools dropped `pkg_resources`, which
  `opentelemetry-bootstrap` still imports.
- **nginx gateway** sets the upstream var **before** `rewrite … break` (else `$up` is empty → HTTP 500).
- **RabbitMQ** readiness probe uses `timeoutSeconds: 15` (the `rabbitmq-diagnostics` CLI cold-start
  exceeds the 1s default and flaps readiness, which crashes payment).
- **Jaeger UI** is served by service `jaeger:16686` (not `jaeger-query`) — fixed in
  `observability/ingress/ui-ingress.yaml`.
- **Grafana ↔ Jaeger datasource**: viewing these traces *inside Grafana* still hits the Jaeger-v2
  datasource compatibility gap (round-1). Use Jaeger's own UI for now.

## Layout
```
roboshop-microservices/
├── Makefile              # build / deploy / load / destroy
├── namespace.yaml
├── datastores/           # mysql (+ db/ init SQL), mongodb, valkey, rabbitmq
├── services/             # the 9 service Deployments + Services
├── ingress.yaml          # roboshop.<DOMAIN> → frontend
├── images/<svc>/         # instrumented build context per service (source + Dockerfile)
└── loadgen/              # k6 end-to-end traffic injector (journey.js + Deployment)
```
