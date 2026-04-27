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
