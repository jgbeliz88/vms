# Inicializar con:
#   terraform init \
#     -backend-config="key=$(jq -r '.app' ../../project.json)/$(jq -r '.project_name' ../../project.json)/$(pwd |awk -F/ '{print $(NF)}')/terraform.tfstate"
#   terraform init -backend-config="key=$(jq -r '.app' ../../project.json)/$(jq -r '.project_name' ../../project.json)/$(pwd |awk -F/ '{print $(NF)}')/terraform.tfstate"

terraform {
  required_version = "1.8.5"

  backend "s3" {
    bucket          = "terraform-remote-state-vault"
    region          =  "eu-west-1"
    dynamodb_table  = "terraform_statelock"
  }

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 4.26"
    }

    vault = {
      source  = "hashicorp/vault"
      version = "4.4.0"
    }
  }
}

provider "aws" {
  alias = "sharedservices"
  region = local.region
  assume_role {
    role_arn     = "arn:aws:iam::088427993007:role/MDSCrossAccountAdminRole"
    session_name = "shsvc-deployment"
  }
  default_tags {
    tags = local.aws_default_tags
  }
}

provider "github" {
  owner    = "grupomediaset"
  base_url = "https://api.github.com/"
}

provider "vault" {
  address = "https://vault.mediaset.es:8200"
}
