Inicializar los terraform con:

INFRA (key)
terraform init -backend-config="key=$(jq -r '.app' ../../project.json)/$(jq -r '.project_name' ../../project.json)/$(pwd |awk -F/ '{print $(NF)}')/terraform.tfstate"

DEPLOY (workspace_key_prefix)
terraform init -backend-config="workspace_key_prefix=$(jq -r '.app' ../../project.json)/$(jq -r '.project_name' ../../project.json)/$(pwd |awk -F/ '{print $(NF)}')"

Para lanzar el plan:

terraform plan -var-file=../../project.json

alias tfpp='terraform plan -var-file=../../project.json'
alias tfpa='terraform apply -var-file=../../project.json'
alias tfpi='terraform init -backend-config="key=$(jq -r '.app' ../../project.json)/$(jq -r '.project_name' ../../project.json)/infra/terraform.tfstate"'


DEPLOY está regido por Workspaces
INFRA NO tiene Workspaces
