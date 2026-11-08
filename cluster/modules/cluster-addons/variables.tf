variable "cluster_name" { type = string }
variable "region" { type = string }

variable "ebs_csi_role_arn" { type = string }
variable "external_dns_role_arn" { type = string }
variable "autoscaler_role_arn" { type = string }

# Round-1 (tiny) runs a small, fixed-size workload — the managed node groups already replace dead
# nodes, so Cluster Autoscaler (scale-up under load) is off by default. Its Helm chart is also
# hosted on GitHub Releases, which has intermittent 504s; keeping it off avoids that dependency.
variable "enable_cluster_autoscaler" {
  type    = bool
  default = false
}

variable "external_dns_domain_filters" {
  description = "Domains external-dns is allowed to manage in this cluster (public, + private for obs)."
  type        = list(string)
}

variable "acm_certificate_arn" {
  description = "ACM cert for the public Traefik NLB (TLS terminated at the NLB)."
  type        = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
