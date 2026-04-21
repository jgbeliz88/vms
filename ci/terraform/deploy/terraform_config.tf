# Inicializar con:
#   terraform init \
#     -backend-config="key=$(jq -r '.app' ../../project.json)/$(jq -r '.project_name' ../../project.json)/$(pwd |awk -F/ '{print $(NF)}')"
#   terraform init -backend-config="workspace_key_prefix=$(jq -r '.app' ../../project.json)/$(jq -r '.project_name' ../../project.json)/$(pwd |awk -F/ '{print $(NF)}')"



terraform {
  required_version = "1.8.5"

  backend "s3" {
    bucket               = "terraform-remote-state-vault"
    key                  = "terraform.tfstate"
    region               = "eu-west-1"
    dynamodb_table       = "terraform_statelock"
  }

  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = "5.53.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.11.0"
    }
    vault = {
      source  = "hashicorp/vault"
      version = "4.4.0"
    }
  }
}

provider "aws" {
  region = local.region
  assume_role {
    role_arn     = "arn:aws:iam::${local.account_number[terraform.workspace]}:role/MDSCrossAccountAdminRole"
    session_name = "deployment-session"
  }
  default_tags {
    tags = local.aws_default_tags
  }
}

data "aws_caller_identity" "current" {}

locals {
  vault_addr = {
    mds = "https://vault-mds.mediaset.es"
    aws = "https://vault-aws.awsinternal.mediaset.es"
    azr = "https://vault-azr.azrinternal.mediaset.es"
  }

}
provider "vault" {
  alias  = "mds"
  address = local.vault_addr["mds"]
  token = var.token_vault_mds
  skip_tls_verify = true
  #  auth_login_oidc {
  #    role = "Default"
  #  }
}
provider "vault" {
  alias  = "aws"
  address = local.vault_addr["aws"]
  token = var.token_vault_aws
  skip_tls_verify = true
  #  auth_login_oidc {
  #    role = "Default"
  #  }
}
provider "vault" {
  alias  = "azr"
  address = local.vault_addr["azr"]
  token = var.token_vault_azr
  skip_tls_verify = true
  #  auth_login_oidc {
  #    role = "Default"
  #  }
}
