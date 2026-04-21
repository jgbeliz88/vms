variable "aws_region" {
  description = "AWS default region"
  type        = string
  default     = "eu-west-1"
}

variable "token_vault_mds" { default = {} }
variable "token_vault_aws" { default = {} }
variable "token_vault_azr" { default = {} }
