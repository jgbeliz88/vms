
data "terraform_remote_state" "eks_global_multipro" {
  backend = "s3"
  config = {
    bucket  = "terraform-remote-state-vault"
    key     = "sm_eks_global/multipro/terraform.tfstate"
    region  = var.aws_region
    profile = "USERS"
  }
}

data "terraform_remote_state" "eks_global_multipre" {
  backend = "s3"
  config = {
    bucket  = "terraform-remote-state-vault"
    key     = "sm_eks_global/multipre/terraform.tfstate"
    region  = var.aws_region
    profile = "USERS"
  }
}

data "terraform_remote_state" "eks_global_multiint" {
  backend = "s3"
  config = {
    bucket  = "terraform-remote-state-vault"
    key     = "sm_eks_global/multiint/terraform.tfstate"
    region  = var.aws_region
    profile = "USERS"
  }
}

data "terraform_remote_state" "ssp" {
  backend = "s3"
  config = {
    bucket  = "terraform-remote-state-vault"
    key     = "SHAREDSERVICES/SHAREDSERVICES-PRO.tfstate"
    region  = var.aws_region
    profile = "USERS"
  }
}

data "terraform_remote_state" "github" {
  backend = "s3"
  config = {
    bucket  = "terraform-remote-state-vault"
    key     = "github/PRO/github-pro.tfstate"
    region  = var.aws_region
    profile = "USERS"
  }
}
