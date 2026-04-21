resource "vault_generic_secret" "initial_path_secrets" {
  #  for_each = toset(var.vault_paths)
  for_each = toset(local.local_data.terraform.vault_paths)

  path         = "${local.local_data.terraform.vault_main_path}/${local.local_data.project_name}/${each.value}" # note: each.key and each.value are the same for a set
  disable_read = true
  data_json = jsonencode({
    init_key = "valor-0"
  })
}
