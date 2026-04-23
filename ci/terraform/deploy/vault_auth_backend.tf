# -------------------------------------------------
# -------- Kubernetes Auth Backend ROLES for K8S --
# -------------------------------------------------
resource "vault_kubernetes_auth_backend_role" "k8s_backend_roles_mds" {
  provider = vault.mds

  backend                          = local.backend_name_role[terraform.workspace]
  role_name                        = local.local_data["project_name"]
  bound_service_account_names      = [local.local_data["project_name"]]
  bound_service_account_namespaces = [local.local_data["project_name"]]
  token_ttl                        = 300
  token_policies                   = local.local_data.terraform.vault_role_policies
}
# terraform import 'vault_kubernetes_auth_backend_role.k8s_backend_roles_mds["mdsusp"]' auth/aks-unifiedstreaming-pre/role/mdsusp

resource "vault_kubernetes_auth_backend_role" "k8s_backend_roles_aws" {
  provider = vault.aws

  backend                          = local.backend_name_role[terraform.workspace]
  role_name                        = local.local_data["project_name"]
  bound_service_account_names      = [local.local_data["project_name"]]
  bound_service_account_namespaces = [local.local_data["project_name"]]
  token_ttl                        = 300
  token_policies                   = local.local_data.terraform.vault_role_policies
}
# terraform import 'vault_kubernetes_auth_backend_role.k8s_backend_roles_aws["mdsusp"]' auth/aks-unifiedstreaming-pre/role/mdsusp

resource "vault_kubernetes_auth_backend_role" "k8s_backend_roles_azr" {
  provider = vault.azr

  backend                          = local.backend_name_role[terraform.workspace]
  role_name                        = local.local_data["project_name"]
  bound_service_account_names      = [local.local_data["project_name"]]
  bound_service_account_namespaces = [local.local_data["project_name"]]
  token_ttl                        = 300
  token_policies                   = local.local_data.terraform.vault_role_policies
}
# terraform import 'vault_kubernetes_auth_backend_role.k8s_backend_roles_azr["mdsusp"]' auth/aks-unifiedstreaming-pre/role/mdsusp


locals {
  backend_name_role = {
    pre = "aks-unifiedstreaming-pre"
    pro = "aks-unifiedstreaming-pro"
  }
}
# -------------------------------------------------
