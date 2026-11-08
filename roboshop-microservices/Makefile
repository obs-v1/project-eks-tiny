# ─────────────────────────────────────────────────────────────────────────────
#  roboshop-microservices — round-2 observed app for project-eks-tiny (EKS).
#
#  9 instrumented services (5 languages) + 4 datastores, deployed to the app cluster
#  (obs-v1-bankobs) in namespace `roboshop`, meeting the full observability standard:
#    traces  → OTLP push to otel-collector.obs.internal:4317
#    metrics → /metrics (or /actuator/prometheus) scraped by the node agent
#    logs    → JSON to stdout, tailed by the node agent → Loki (carry trace_id)
#
#  Two phases, two places:
#    make build  [REG=...]            # on a Docker host (your Mac): build + push all 9 images
#    make deploy DOMAIN=lab.example.com   # on the workstation: apply manifests to the app cluster
#
#  The images are PUBLIC ECR (world-pullable), so the cluster needs no registry creds.
# ─────────────────────────────────────────────────────────────────────────────
REG     ?= public.ecr.aws/w8x4g9h7/roboshop-v3
TAG     ?= 1.0.0
CTX     ?= obs-v1-bankobs
NS      ?= roboshop
REGION  ?= us-east-1
DOMAIN  ?=

SERVICES = catalogue user cart shipping payment ratings orders notification frontend
K = kubectl --context $(CTX)

VUS      ?= 5
DURATION ?= 24h
LOAD_BASE ?= http://frontend.roboshop.svc.cluster.local

.PHONY: help build build-one push-login deploy datastores seed-db services load load-stop destroy ensure-context

help:
	@echo "roboshop-microservices — EKS observed app (see README.md)"
	@echo ""
	@echo "  make build                       build+push 9 images to $(REG)  (run on your Mac/Docker host)"
	@echo "  make build-one S=catalogue       build+push one service"
	@echo "  make deploy DOMAIN=<domain>       deploy datastores + services + ingress (run on the workstation)"
	@echo "  make load [VUS=5 DURATION=24h]    start the k6 end-to-end traffic injector"
	@echo "  make load LOAD_BASE=https://roboshop.<domain>   drive the public URL instead"
	@echo "  make load-stop                   stop the injector"
	@echo "  make destroy                     remove services + datastores (keeps namespace)"
	@echo ""
	@echo "  UIs:  https://roboshop.<domain>   https://jaeger.<domain>/search   https://prometheus.<domain>   https://grafana.<domain>"

# ---- Phase 1: build + push all images (run on a machine WITH Docker, e.g. your Mac) ----
# Public ECR repos must exist first (roboshop-v3/<svc>); create any missing ones with:
#   aws ecr-public create-repository --repository-name roboshop-v3/<svc> --region us-east-1
build: push-login
	@for s in $(SERVICES); do \
	  echo "========== building + pushing $$s =========="; \
	  docker buildx build --platform linux/amd64 -t $(REG)/$$s:$(TAG) --push images/$$s || exit 1; \
	done
	@echo "  ✓ all images pushed to $(REG)/*:$(TAG)"

push-login:
	aws ecr-public get-login-password --region $(REGION) | docker login --username AWS --password-stdin public.ecr.aws

# Build+push one service:  make build-one S=catalogue
build-one: push-login
	docker buildx build --platform linux/amd64 -t $(REG)/$(S):$(TAG) --push images/$(S)

# ---- Phase 2: deploy (run on the workstation, which has the cluster contexts) ----
ensure-context:
	@kubectl config get-contexts $(CTX) >/dev/null 2>&1 || aws eks update-kubeconfig --region $(REGION) --name $(CTX) --alias $(CTX) >/dev/null

deploy: ensure-context datastores services
	@test -n "$(DOMAIN)" && { sed 's|$${DOMAIN}|$(DOMAIN)|g' ingress.yaml | $(K) apply -f -; echo "  UI (once DNS): https://roboshop.$(DOMAIN)"; } || echo "  (no DOMAIN set — skipped ingress; port-forward svc/frontend 80 to test)"
	@echo "  ✓ roboshop-microservices deployed to $(CTX)."

# Datastores: MySQL (3 DBs from db/*.sql via an init ConfigMap), MongoDB, Valkey, RabbitMQ.
datastores:
	$(K) apply -f namespace.yaml
	$(K) -n $(NS) create configmap roboshop-db-init --from-file=datastores/db \
	  --dry-run=client -o yaml | $(K) apply -f -
	$(K) apply -f datastores/mysql.yaml -f datastores/mongodb.yaml -f datastores/valkey.yaml -f datastores/rabbitmq.yaml
	$(K) -n $(NS) rollout status statefulset/mysql --timeout=180s

# Re-load the 3 MySQL databases into an already-running mysql (idempotent; use when mysql was not
# freshly initialised, e.g. a volume reused from a previous app).
seed-db:
	@for f in datastores/db/*.sql; do echo "-- $$f"; $(K) exec -i -n $(NS) mysql-0 -- sh -c 'mysql -uroot -pRoboShop@1' < $$f; done

services:
	$(K) apply -f services/

# ---- End-to-end traffic injector (k6) — generate distributed traces on demand ----
#   make load            # start 5 VUs walking browse->register->cart->checkout->orders
#   make load VUS=15 DURATION=1h
#   make load LOAD_BASE=https://roboshop.$(DOMAIN)   # drive the public URL instead
#   make load-stop
load: ensure-context
	$(K) -n $(NS) create configmap loadgen-script --from-file=journey.js=loadgen/journey.js \
	  --dry-run=client -o yaml | $(K) apply -f -
	$(K) apply -f loadgen/loadgen.yaml
	$(K) -n $(NS) set env deploy/loadgen VUS=$(VUS) DURATION=$(DURATION) BASE_URL=$(LOAD_BASE)
	$(K) -n $(NS) rollout status deploy/loadgen --timeout=90s
	@echo "  ✓ load generator running ($(VUS) VUs -> $(LOAD_BASE)). Logs: kubectl -n $(NS) logs -f deploy/loadgen . Stop: make load-stop"

load-stop: ensure-context
	-$(K) -n $(NS) delete deploy/loadgen
	@echo "  ✓ load generator stopped"

destroy: ensure-context
	-$(K) delete -f services/ --ignore-not-found
	-$(K) delete -f datastores/mysql.yaml -f datastores/mongodb.yaml -f datastores/valkey.yaml -f datastores/rabbitmq.yaml --ignore-not-found
	-$(K) -n $(NS) delete configmap roboshop-db-init --ignore-not-found
	@echo "  ✓ roboshop-microservices removed (namespace $(NS) kept)."
