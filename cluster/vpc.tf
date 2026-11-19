data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 3)
}

# ── Observability VPC ─────────────────────────────────────────────────────────
module "vpc_observability" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 6.0"

  name = "${local.obs_cluster_name}-vpc"
  cidr = var.obs_vpc_cidr
  azs  = local.azs

  private_subnets = [for i in range(3) : cidrsubnet(var.obs_vpc_cidr, 4, i)]
  public_subnets  = [for i in range(3) : cidrsubnet(var.obs_vpc_cidr, 4, i + 8)]

  enable_nat_gateway   = true
  single_nat_gateway   = true # one NAT for the whole VPC — cheaper, fine for a lab
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Subnet tags EKS needs for ELB/NLB placement and subnet discovery.
  public_subnet_tags = {
    "kubernetes.io/role/elb"                          = "1"
    "kubernetes.io/cluster/${local.obs_cluster_name}" = "shared"
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"                 = "1"
    "kubernetes.io/cluster/${local.obs_cluster_name}" = "shared"
  }

  tags = local.tags
}

# ── RoboShop VPC ───────────────────────────────────────────────────────────────
module "vpc_roboshop" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 6.0"

  name = "${local.roboshop_cluster_name}-vpc"
  cidr = var.roboshop_vpc_cidr
  azs  = local.azs

  private_subnets = [for i in range(3) : cidrsubnet(var.roboshop_vpc_cidr, 4, i)]
  public_subnets  = [for i in range(3) : cidrsubnet(var.roboshop_vpc_cidr, 4, i + 8)]

  enable_nat_gateway   = true
  single_nat_gateway   = true
  enable_dns_hostnames = true
  enable_dns_support   = true

  public_subnet_tags = {
    "kubernetes.io/role/elb"                               = "1"
    "kubernetes.io/cluster/${local.roboshop_cluster_name}" = "shared"
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"                      = "1"
    "kubernetes.io/cluster/${local.roboshop_cluster_name}" = "shared"
  }

  tags = local.tags
}
