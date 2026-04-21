#!/usr/bin/env bash
# Example: . ./creds.sh --verbose

export TF_VAR_address_vault_mds="https://vault-mds.mediaset.es"
export TF_VAR_address_vault_aws="https://vault-aws.awsinternal.mediaset.es"
export TF_VAR_address_vault_azr="https://vault-azr.azrinternal.mediaset.es"

VAULT_STATUS_MDS=$(VAULT_TOKEN=${TF_VAR_token_vault_mds} vault kv get -address=${TF_VAR_address_vault_mds} -field=status2 checkmk/vaultstatus)
VAULT_STATUS_AWS=$(VAULT_TOKEN=${TF_VAR_token_vault_aws} vault kv get -address=${TF_VAR_address_vault_aws} -field=status2 checkmk/vaultstatus)
VAULT_STATUS_AZR=$(VAULT_TOKEN=${TF_VAR_token_vault_azr} vault kv get -address=${TF_VAR_address_vault_azr} -field=status2 checkmk/vaultstatus)

[[ "${VAULT_STATUS_MDS}" != "vault_cluster_status_mds_pro_OK" ]] && export TF_VAR_token_vault_mds=$(vault login -address="${TF_VAR_address_vault_mds}" -token-only -method=oidc role="default")
[[ "${VAULT_STATUS_AWS}" != "vault_cluster_status_aws_pro_OK" ]] && export TF_VAR_token_vault_aws=$(vault login -address="${TF_VAR_address_vault_aws}" -token-only -method=oidc role="default")
[[ "${VAULT_STATUS_AZR}" != "vault_cluster_status_azr_pro_OK" ]] && export TF_VAR_token_vault_azr=$(vault login -address="${TF_VAR_address_vault_azr}" -token-only -tls-skip-verify -method=oidc role="default")

if [[ ${1} == "--verbose" ]]; then
  echo "TF_VAR_token_vault_mds: ${TF_VAR_token_vault_mds}"
  echo "TF_VAR_token_vault_aws: ${TF_VAR_token_vault_aws}"
  echo "TF_VAR_token_vault_azr: ${TF_VAR_token_vault_azr}"
fi
