locals {
  local_data = jsondecode(file("${path.module}/../../project.json"))
}


variable "token_vault_mds" { default = {} }
variable "token_vault_aws" { default = {} }
variable "token_vault_azr" { default = {} }
