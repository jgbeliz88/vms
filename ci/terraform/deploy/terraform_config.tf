
terraform {
  required_version = "1.13.0"

  backend "azurerm" {
    resource_group_name   = "euw-mes-sc-storage-multi-rg-pro"
    storage_account_name  = "terraformremotestate1"
    container_name        = "terraform-remote-state-vault"
    key                   = "vms/terraform.tfstate"
    subscription_id      = "13cf4c41-bb80-43a0-aa5d-ca00019354d8"
    tenant_id            = "9c72562b-8077-4c0f-8444-ae87fb3a1fbb"
  }

  required_providers {
    azurerm = {
      source = "hashicorp/azurerm"
      version = "= 4.69.0"
    }
    vault = {
      source  = "hashicorp/vault"
      version = "4.4.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 3.6.0"
    }
  }
}

# Use Vault provider
provider "vault" {
}

locals {
  vault_addr = {
    mds = "https://vault-mds.mediaset.es"
    aws = "https://vault-aws.awsinternal.mediaset.es"
    azr = "https://vault-azr.azrinternal.mediaset.es"
  }

}

provider "azuread" {
  tenant_id = "9c72562b-8077-4c0f-8444-ae87fb3a1fbb"
}