# -------------------------------------------------
# -------- Kubernetes Auth Backend ROLES for K8S --
# -------------------------------------------------
resource "vault_kubernetes_auth_backend_role" "k8s_backend_roles_mds" {
  provider = vault.mds

  backend                           = local.vault_auth_path[terraform.workspace]
  role_name                         = local.local_data["project_name"]
  bound_service_account_names       = [local.local_data["project_name"]]
  bound_service_account_namespaces  = [local.local_data["project_name"]]
  token_ttl                         = 300
  token_policies                    = local.local_data["terraform"]["vault_role_policies"]
}

resource "vault_kubernetes_auth_backend_role" "k8s_backend_roles_aws" {
  provider = vault.aws

  backend                           = local.vault_auth_path[terraform.workspace]
  role_name                         = local.local_data["project_name"]
  bound_service_account_names       = [local.local_data["project_name"]]
  bound_service_account_namespaces  = [local.local_data["project_name"]]
  token_ttl                         = 300
  token_policies                    = local.local_data["terraform"]["vault_role_policies"]
}

resource "vault_kubernetes_auth_backend_role" "k8s_backend_roles_azr" {
  provider = vault.azr

  backend                           = local.vault_auth_path[terraform.workspace]
  role_name                         = local.local_data["project_name"]
  bound_service_account_names       = [local.local_data["project_name"]]
  bound_service_account_namespaces  = [local.local_data["project_name"]]
  token_ttl                         = 300
  token_policies                    = local.local_data["terraform"]["vault_role_policies"]
}


locals {
  vault_auth_path = {
    int = "eks-multiint"
    pre = "eks-multipre"
    pro = "eks-multipro"
  }
}
# -------------------------------------------------
