# ─────────────────────────────────────────────────────────────────────────────
#  project-eks — one entry point for the whole lab
#
#  Orchestrates the three component Makefiles in dependency order:
#    cluster/        (Terraform: 2 VPCs + peering + private zone + 2 EKS + addons)
#    observability/  (Helm: Collector, kube-prometheus-stack, Loki, Jaeger, Pyroscope, Pyrra, agent)
#    app/            (BankObs: platform StatefulSets + 60 service charts + frontend)
#
#  Bring everything up (single command):
#    make up ZONE_ID=Z0123... DOMAIN=lab.example.com \
#            ACM_ARN=arn:aws:acm:us-east-1:111122223333:certificate/abcd \
#            LICENSE_KEY=eyJ...
#
#  Tear everything down (reverse order; cluster step also clears LBs, DNS, EBS, log groups):
#    make destroy ZONE_ID=... DOMAIN=... ACM_ARN=...
#
#  Run one layer on its own (same inputs, forwarded to that child only):
#    make cluster ...   |   make observability DOMAIN=...   |   make app LICENSE_KEY=... DOMAIN=...
#
#  Inputs (a child only receives the ones it uses; omit one and that child keeps its own default):
#    ZONE_ID       public hosted-zone id            → cluster           [required for up/destroy]
#    DOMAIN        public base domain               → cluster, obs, app [required for up]
#    ACM_ARN       wildcard ACM cert arn for *.DOMAIN → cluster         [required for up/destroy]
#    LICENSE_KEY   bankobs license (or put it in app/.env)   → app      [required for up]
#    ADMIN_ARN     extra cluster-admin principal    → cluster           [optional]
#    COLLECTOR_HOST private OTLP name BankObs pushes to → obs           [optional]
#    ECR · TAG     bankobs image registry + tag     → app              [optional]
#    REGION        AWS region (default us-east-1)    → all three
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
ifdef LICENSE_KEY
APP_ARGS += LICENSE_KEY=$(LICENSE_KEY)
endif
ifdef ECR
APP_ARGS += ECR=$(ECR)
endif
ifdef TAG
APP_ARGS += TAG=$(TAG)
endif

# Round-1 observed app = Roboshop. The image is PREBUILT and PUBLIC, so `make up` needs no build
# and NO license. Override ROBOSHOP_IMAGE only if you push your own build.
ROBOSHOP_IMAGE ?= public.ecr.aws/w8x4g9h7/roboshop-monolith:1.0.0
ROBOSHOP_ARGS = CTX=obs-v1-bankobs IMAGE=$(ROBOSHOP_IMAGE)
ifdef DOMAIN
ROBOSHOP_ARGS += DOMAIN=$(DOMAIN)
endif

# The layers are strictly ordered (the obs/app layers need the clusters + kubeconfig the cluster
# layer produces), so never let `make -j` interleave them.
.NOTPARALLEL:
.PHONY: up up-roboshop all cluster observability roboshop plan kubeconfig \
        destroy destroy-roboshop destroy-observability destroy-cluster check-up help

help:
	@echo "project-eks-tiny (round-1) — targets:"
	@echo "  make up          cluster (t3 Spot) → observability → Roboshop (small app). No license needed."
	@echo "  make destroy     tear down all (roboshop → observability → cluster)"
	@echo "  make cluster | observability | roboshop     run one layer on its own"
	@echo "  make plan        terraform plan for the cluster layer"
	@echo "  make kubeconfig  point kubectl at both clusters"
	@echo "  Inputs for up:   ZONE_ID, DOMAIN, ACM_ARN  (ROBOSHOP_IMAGE is prebuilt/public by default)"

all: up

# ── Bring up (ROUND-1): cluster (t3 Spot, runs `make kubeconfig`) → obs stack → Roboshop.
#    No license, no image build — the Roboshop image is prebuilt and public. ──
up: check-up
	@echo "═══ 1/3  cluster (Terraform: VPCs, peering, 2 EKS on t3 Spot, addons) ═══"
	$(MAKE) -C cluster apply $(CLUSTER_ARGS)
	@echo "═══ 2/3  observability (Collector, kube-prometheus-stack, Loki, Jaeger, Pyroscope, agent) ═══"
	$(MAKE) -C observability all $(OBS_ARGS)
	@echo "═══ 3/3  roboshop (MySQL + instrumented monolith) ═══"
	$(MAKE) -C roboshop deploy $(ROBOSHOP_ARGS)
	@echo ""
	@echo "  ✓ round-1 is up."
	@echo "    UIs:   https://grafana.$(DOMAIN)   https://jaeger.$(DOMAIN)   https://prometheus.$(DOMAIN)"
	@echo "    App:   https://roboshop.$(DOMAIN)"

up-roboshop: up   ## alias — in tiny, round-1 is the default `up`

# Deploy just the Roboshop layer (cluster + obs already up).
roboshop:
	$(MAKE) -C roboshop deploy $(ROBOSHOP_ARGS)

check-up:
	@test -n "$(ZONE_ID)"  || { echo "ERROR: ZONE_ID required (your public hosted-zone id)"; exit 1; }
	@test -n "$(DOMAIN)"   || { echo "ERROR: DOMAIN required (e.g. lab.example.com)"; exit 1; }
	@test -n "$(ACM_ARN)"  || { echo "ERROR: ACM_ARN required (wildcard cert for *.$(DOMAIN))"; exit 1; }

# ── Individual layers (same forwarded inputs; run any one standalone) ──
cluster:
	$(MAKE) -C cluster apply $(CLUSTER_ARGS)

observability:
	$(MAKE) -C observability all $(OBS_ARGS)

app:
	$(MAKE) -C app all $(APP_ARGS)

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
	-$(MAKE) -C roboshop destroy $(ROBOSHOP_ARGS)

destroy-observability:
	-$(MAKE) -C observability destroy $(OBS_ARGS)

destroy-cluster:
	$(MAKE) -C cluster destroy $(CLUSTER_ARGS)
