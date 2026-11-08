# ─────────────────────────────────────────────────────────────────────────────
#  project-eks/roboshop — the round-1 observed app (Roboshop monolith + MySQL)
#
#  Two phases, run in two places:
#    make build  ALIAS=<ecr-public-alias>      # on a Docker host (your Mac): build + push the image
#    make deploy IMAGE=... DOMAIN=lab.example.com   # on the workstation: deploy to the app cluster
#
#  The image is pushed to PUBLIC ECR (world-pullable), so the cluster needs no registry creds.
#  First time only, create the repo:  aws ecr-public create-repository --repository-name roboshop-monolith --region us-east-1
#
#  Inputs:  ALIAS (your ecr-public registry alias) · IMAGE · DOMAIN · CTX · NS · APPDIR
# ─────────────────────────────────────────────────────────────────────────────
CTX    ?= obs-v1-bankobs
NS     ?= roboshop
REGION ?= us-east-1
DOMAIN ?=
ALIAS  ?=
IMAGE  ?= public.ecr.aws/$(ALIAS)/roboshop-monolith:1.0.0
# The instrumented app source tree to build (on the Mac). Override if your checkout differs.
APPDIR ?= $(HOME)/repos/claude/roboshop-v3/monolith/app

K = kubectl --context $(CTX)

.PHONY: build deploy load destroy ensure-context

# ---- Phase 1: build + push (run on a machine WITH Docker, e.g. your Mac) ----
build:
	@test -n "$(ALIAS)" || { echo "ERROR: set ALIAS=<your ecr-public alias>  (aws ecr-public create-repository --repository-name roboshop-monolith --region us-east-1)"; exit 1; }
	aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws
	docker buildx build --platform linux/amd64 -t $(IMAGE) --push "$(APPDIR)"
	@echo "  ✓ pushed $(IMAGE)"

# ---- Phase 2: deploy (run on the workstation, which has the cluster contexts) ----
ensure-context:
	@kubectl config get-contexts $(CTX) >/dev/null 2>&1 || aws eks update-kubeconfig --region $(REGION) --name $(CTX) --alias $(CTX) >/dev/null

deploy: ensure-context
	@test -n "$(ALIAS)" -o -n "$(IMAGE)" || { echo "ERROR: set IMAGE=public.ecr.aws/<alias>/roboshop-monolith:1.0.0"; exit 1; }
	$(K) apply -f namespace.yaml
	# DB schema + master data → ConfigMap the MySQL StatefulSet mounts as init scripts. MySQL runs
	# /docker-entrypoint-initdb.d/*.sql ALPHABETICALLY, so key them 01-/02- to force schema before
	# data (plain names sort master-data.sql before schema.sql → inserts fail on missing tables).
	$(K) -n $(NS) create configmap roboshop-db-init \
	  --from-file=01-schema.sql=db/schema.sql --from-file=02-master-data.sql=db/master-data.sql \
	  --dry-run=client -o yaml | $(K) apply -f -
	$(K) apply -f mysql.yaml
	@sed 's|$${ROBOSHOP_IMAGE}|$(IMAGE)|g' roboshop.yaml | $(K) apply -f -
	@test -n "$(DOMAIN)" && { sed 's|$${DOMAIN}|$(DOMAIN)|g' ingress.yaml | $(K) apply -f -; echo "  UI (once DNS): https://roboshop.$(DOMAIN)"; } || echo "  (no DOMAIN set — skipped ingress; port-forward svc/roboshop 8080 to test)"
	@echo "  ✓ roboshop deployed to $(CTX)."

# Generate traffic so traces/metrics/logs have data (k6 ships in the app repo's load-test/).
load:
	@echo "Run from a host with k6:  k6 run $(APPDIR)/load-test/load-test.js -e BASE_URL=https://roboshop.$(DOMAIN)"

destroy: ensure-context
	-$(K) delete namespace $(NS)
	@echo "  ✓ roboshop removed."
