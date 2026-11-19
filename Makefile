# ─────────────────────────────────────────────────────────────────────────────
#  project-eks-tiny — one entry point for the whole lab
#
#  Orchestrates the component layers in dependency order:
#    cluster/                (Terraform: 2 VPCs + peering + private zone + 2 EKS on t3 Spot + addons)
#    observability/          (Helm: Collector, kube-prometheus-stack, Loki, Jaeger, Pyroscope, agent)
#    roboshop-microservices/ (the observed app: 9 services / 5 languages + 4 datastores, instrumented)
#
#  Bring everything up (single command — NO license, images are prebuilt & public):
#    make up ZONE_ID=Z0123... DOMAIN=lab.example.com \
#            ACM_ARN=arn:aws:acm:us-east-1:111122223333:certificate/abcd
#
#  Tear everything down (reverse order; cluster step also clears LBs, DNS, EBS, log groups):
#    make destroy ZONE_ID=... DOMAIN=... ACM_ARN=...
#
#  Run one layer on its own (same inputs, forwarded to that child only):
#    make cluster ...   |   make observability DOMAIN=...   |   make roboshop DOMAIN=...
#
#  Inputs (a child only receives the ones it uses; omit one and that child keeps its own default):
#    ZONE_ID       public hosted-zone id            → cluster           [required for up/destroy]
#    DOMAIN        public base domain               → cluster, obs, app [required for up]
#    ACM_ARN       wildcard ACM cert arn for *.DOMAIN → cluster         [required for up/destroy]
#    ADMIN_ARN     extra cluster-admin principal    → cluster           [optional]
#    COLLECTOR_HOST private OTLP name the app pushes to → obs           [optional]
#    REGION        AWS region (default us-east-1)    → all layers
# ─────────────────────────────────────────────────────────────────────────────
REGION ?= us-east-1

# Forward an input to a child only when it's set, so an unset input leaves the child on its own
# default instead of being overridden with an empty value (e.g. a blank REGION or CTX).
CLUSTER_ARGS = REGION=$(REGION)
OBS_ARGS     = REGION=$(REGION)
APP_ARGS     = REGION=$(REGION)

ifdef DOMAIN
CLUSTER_ARGS += DOMAIN=$(DOMAIN)
OBS_ARGS     += DOMAIN=$(DOMAIN)
APP_ARGS     += DOMAIN=$(DOMAIN)
endif
ifdef ZONE_ID
CLUSTER_ARGS += ZONE_ID=$(ZONE_ID)
endif
ifdef ACM_ARN
CLUSTER_ARGS += ACM_ARN=$(ACM_ARN)
endif
ifdef ADMIN_ARN
CLUSTER_ARGS += ADMIN_ARN=$(ADMIN_ARN)
endif
ifdef COLLECTOR_HOST
OBS_ARGS += COLLECTOR_HOST=$(COLLECTOR_HOST)
endif

# The layers are strictly ordered (the obs/app layers need the clusters + kubeconfig the cluster
# layer produces), so never let `make -j` interleave them.
.NOTPARALLEL:
.PHONY: up all cluster observability roboshop load load-stop plan kubeconfig \
        destroy destroy-roboshop destroy-observability destroy-cluster check-up help

help:
	@echo "project-eks-tiny — targets:"
	@echo "  make up          cluster (t3 Spot) → observability → RoboShop microservices. No license needed."
	@echo "  make destroy     tear down all (roboshop → observability → cluster)"
	@echo "  make cluster | observability | roboshop     run one layer on its own"
	@echo "  make load | load-stop     start/stop the k6 end-to-end traffic injector (see roboshop-microservices/)"
	@echo "  make plan        terraform plan for the cluster layer"
	@echo "  make kubeconfig  point kubectl at both clusters"
	@echo "  Inputs for up:   ZONE_ID, DOMAIN, ACM_ARN   (app images are prebuilt & public)"

all: up

# ── Bring up: cluster (t3 Spot, runs `make kubeconfig`) → obs stack → RoboShop microservices.
#    No license, no image build — the RoboShop images are prebuilt and public. ──
up: check-up
	@echo "═══ 1/3  cluster (Terraform: VPCs, peering, 2 EKS on t3 Spot, addons) ═══"
	$(MAKE) -C cluster apply $(CLUSTER_ARGS)
	@echo "═══ 2/3  observability (Collector, kube-prometheus-stack, Loki, Jaeger, Pyroscope, agent) ═══"
	$(MAKE) -C observability all $(OBS_ARGS)
	@echo "═══ 3/3  roboshop-microservices (datastores + 9 instrumented services + frontend) ═══"
	$(MAKE) -C roboshop-microservices deploy $(APP_ARGS)
	@echo ""
	@echo "  ✓ project-eks-tiny is up."
	@echo "    UIs:   https://grafana.$(DOMAIN)   https://jaeger.$(DOMAIN)   https://prometheus.$(DOMAIN)"
	@echo "    App:   https://roboshop.$(DOMAIN)   (generate traffic: make load)"

check-up:
	@test -n "$(ZONE_ID)"  || { echo "ERROR: ZONE_ID required (your public hosted-zone id)"; exit 1; }
	@test -n "$(DOMAIN)"   || { echo "ERROR: DOMAIN required (e.g. lab.example.com)"; exit 1; }
	@test -n "$(ACM_ARN)"  || { echo "ERROR: ACM_ARN required (wildcard cert for *.$(DOMAIN))"; exit 1; }

# ── Individual layers (same forwarded inputs; run any one standalone) ──
cluster:
	$(MAKE) -C cluster apply $(CLUSTER_ARGS)

observability:
	$(MAKE) -C observability all $(OBS_ARGS)

roboshop:
	$(MAKE) -C roboshop-microservices deploy $(APP_ARGS)

# Start/stop the end-to-end traffic injector (k6). See roboshop-microservices/README.md.
load:
	$(MAKE) -C roboshop-microservices load
load-stop:
	$(MAKE) -C roboshop-microservices load-stop

plan:
	$(MAKE) -C cluster plan $(CLUSTER_ARGS)

kubeconfig:
	$(MAKE) -C cluster kubeconfig $(CLUSTER_ARGS)

# ── Tear down in reverse. The app/obs helm uninstalls remove their LoadBalancer Services (so the
# cluster layer has fewer NLBs to reap); the cluster layer then does the full LB/DNS/EBS/log-group
# cleanup and destroys the infra. app/obs are best-effort (`-`) so a hiccup there never blocks the
# cluster teardown, which is what frees the expensive resources. ──
destroy: destroy-roboshop destroy-observability destroy-cluster
	@echo ""
	@echo "  ✓ project-eks-tiny torn down."

destroy-roboshop:
	-$(MAKE) -C roboshop-microservices destroy $(APP_ARGS)

destroy-observability:
	-$(MAKE) -C observability destroy $(OBS_ARGS)

destroy-cluster:
	$(MAKE) -C cluster destroy $(CLUSTER_ARGS)
