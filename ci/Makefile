SHELL := bash
.ONESHELL:
.SHELLFLAGS := -eu -o pipefail -c
.DELETE_ON_ERROR:
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules

## color vars

red:=$(shell tput setaf 1)
green:=$(shell tput setaf 2)
orange:=$(shell tput setaf 3)
blue:=$(shell tput setaf 4)
magenta:=$(shell tput setaf 5)
reset:=$(shell tput sgr0)


ifeq ($(origin .RECIPEPREFIX), undefined)
  $(error This Make does not support .RECIPEPREFIX. Please use GNU Make 4.0 or later)
endif
.RECIPEPREFIX = >

.DEFAULT_GOAL := get-deploy

WORKSPACE=$(shell git rev-parse --show-toplevel)
## Nombre de la Aplicación p.e. rwd
APP_NAME=$(shell jq -r '.app' ${WORKSPACE}/ci/project.json)
## Nombre de la proyecto p.e. faceman
PRJ_NAME=$(shell jq -r '.project_name' ${WORKSPACE}/ci/project.json)
## Nombre del equipo de desarrollo p.e. dm
DEV_TEAM=$(shell jq -r '.developers_team' ${WORKSPACE}/ci/project.json)
## Directorio del proyecto en local p.e. /Users/deploy/apps
REPO_PRJ="euw1-mes-$(DEV_TEAM)-$(PRJ_NAME)"
DIR_APPS="/Users/deploy/apps"
SISTEMA=$(shell uname -s)

# ============================================================================================
# Etiquetas desde el repo template
# ============================================================================================

.PHONY: crear-repositorio
crear-repositorio:
> @[[ "$(shell jq -r '.app' project.json)" == "XXX_TIPO_DE_APP_XXX" ]] && (echo""; echo "$(reset)$(red)FALTA MODIFICAR app$(reset) en project.json"; echo""; exit 1)
> @[[ "$(shell jq -r '.project_name' project.json)" == "XXX_NOMBRE_DEL_PROYECTO_XXX" ]] && (echo""; echo "$(reset)$(red)FALTA MODIFICAR project_name$(reset) en project.json"; echo""; exit 1)
> @[[ "$(shell jq -r '.project_description' project.json)" == "XXX_DESCRIPCION_DEL_PROYECTO_XXX" ]] && (echo""; echo "$(reset)$(red)FALTA MODIFICAR project_description$(reset) en project.json"; echo""; exit 1)
> @[[ "$(shell jq -r '.developers_team' project.json)" == "XXX_EQUIPO_DE_DESARROLLO_XXX" ]] && (echo""; echo "$(reset)$(red)FALTA MODIFICAR developers_team$(reset) en project.json"; echo""; exit 1)
> @[[ "$(shell jq -r '.terraform.approvers_members_team[]' project.json)" == "XXX_USER01_XXX" ]] && (echo""; echo "$(reset)$(red)FALTA MODIFICAR terraform.approvers_members_team$(reset) en project.json"; echo""; exit 1)
> @[[ "$(shell jq -r '.terraform.approvers_parent_team' project.json)" == "XXX_ID_PARENT_TEAM_XXX" ]] && (echo""; echo "$(reset)$(red)FALTA MODIFICAR terraform.approvers_parent_team$(reset) en project.json"; echo""; exit 1)
> @echo "$(blue)>> Generando repositorio del projecto $(reset)$(magenta)$(REPO_PRJ)$(reset)$(blue) y su configuración$(reset)"
> @cd ${WORKSPACE}/ci/terraform/infra
> @/var/lib/rundeck/.tfenv/bin/terraform init -backend-config="key=${APP_NAME}/${PRJ_NAME}/infra/terraform.tfstate"
> @/var/lib/rundeck/.tfenv/bin/terraform plan -out tmp_PLAN1.plan -var-file=../../project.json --target={module.repos,github_team_membership.grupomediaset}
> @/var/lib/rundeck/.tfenv/bin/terraform apply tmp_PLAN1.plan
> @/var/lib/rundeck/.tfenv/bin/terraform plan -out tmp_PLAN2.plan -var-file=../../project.json --target={module.repos,github_team_repository.push-access-group}
> @/var/lib/rundeck/.tfenv/bin/terraform apply tmp_PLAN2.plan
> @echo "$(blue)>> Clonando repositorio  $(reset)$(magenta)$(REPO_PRJ) en local$(reset)"
> @cd ${DIR_APPS}
> @[[ ! -d "${REPO_PRJ}" ]] && git clone git@github.com:grupomediaset/$(REPO_PRJ).git
> @cp ${WORKSPACE}/ci/project.json ${DIR_APPS}/$(REPO_PRJ)/ci
> @echo "$(blue)>> Cambiando configuración K8s del projecto $(magenta)${PRJ_NAME}$(reset)"
> @cd ${DIR_APPS}/$(REPO_PRJ)/ci
> @[[ ${SISTEMA} != "Darwin" ]] && find ${DIR_APPS}/$(REPO_PRJ)/ci/k8s -name "*.yaml" -print | xargs sed -i "s/__PRJ_NAME__/${PRJ_NAME}/g"
> @[[ ${SISTEMA} == "Darwin" ]] && find ${DIR_APPS}/$(REPO_PRJ)/ci/k8s -name "*.yaml" -print | xargs sed -i '' "s/__PRJ_NAME__/${PRJ_NAME}/g"
> @[[ ${SISTEMA} != "Darwin" ]] && sed -i "s/__PRJ_NAME__/${PRJ_NAME}/" Jenkinsfile
> @[[ ${SISTEMA} == "Darwin" ]] && sed -i '' "s/__PRJ_NAME__/${PRJ_NAME}/" Jenkinsfile
> @cd ${DIR_APPS}/$(REPO_PRJ)
> @git add ci/*
> @git commit -m "change project.json and K8s files"
> @git push
> @cd ${WORKSPACE}
> @git checkout ci/project.json
> @rm -rf ${WORKSPACE}/ci/terraform/infra/.terraform ${WORKSPACE}/ci/terraform/infra/.terraform.lock.hcl ${WORKSPACE}/ci/terraform/infra/tmp_*

.PHONY: crear-repositorio-jenkins
crear-repositorio-jenkins:
> @set -x
> @[[ "$(shell jq -r '.app' project.json)" == "XXX_TIPO_DE_APP_XXX" ]] && (echo""; echo "$(reset)$(red)FALTA MODIFICAR app$(reset) en project.json"; echo""; exit 1)
> @[[ "$(shell jq -r '.project_name' project.json)" == "XXX_NOMBRE_DEL_PROYECTO_XXX" ]] && (echo""; echo "$(reset)$(red)FALTA MODIFICAR project_name$(reset) en project.json"; echo""; exit 1)
> @[[ "$(shell jq -r '.project_description' project.json)" == "XXX_DESCRIPCION_DEL_PROYECTO_XXX" ]] && (echo""; echo "$(reset)$(red)FALTA MODIFICAR project_description$(reset) en project.json"; echo""; exit 1)
> @[[ "$(shell jq -r '.developers_team' project.json)" == "XXX_EQUIPO_DE_DESARROLLO_XXX" ]] && (echo""; echo "$(reset)$(red)FALTA MODIFICAR developers_team$(reset) en project.json"; echo""; exit 1)
> @[[ "$(shell jq -r '.terraform.approvers_members_team[]' project.json)" == "XXX_USER01_XXX" ]] && (echo""; echo "$(reset)$(red)FALTA MODIFICAR terraform.approvers_members_team$(reset) en project.json"; echo""; exit 1)
> @[[ "$(shell jq -r '.terraform.approvers_parent_team' project.json)" == "XXX_ID_PARENT_TEAM_XXX" ]] && (echo""; echo "$(reset)$(red)FALTA MODIFICAR terraform.approvers_parent_team$(reset) en project.json"; echo""; exit 1)
> @echo "$(blue)>> Generando repositorio del projecto $(reset)$(magenta)$(REPO_PRJ)$(reset)$(blue) y su configuración$(reset)"
> @cd ${WORKSPACE}/ci/terraform/infra_jenkins
> @terraform init -backend-config="key=${APP_NAME}/${PRJ_NAME}/infra/terraform.tfstate"
> @terraform plan -out tmp_PLAN1.plan -var-file=../../project.json --target={module.repos,github_team_membership.grupomediaset}
> @terraform apply tmp_PLAN1.plan
> @terraform plan -out tmp_PLAN2.plan -var-file=../../project.json --target={module.repos,github_team_repository.push-access-group}
> @terraform apply tmp_PLAN2.plan
> @echo "$(blue)>> Clonando repositorio  $(reset)$(magenta)$(REPO_PRJ) en local$(reset)"
> @cd ${DIR_APPS}
> @[[ ! -d "${REPO_PRJ}" ]] && git clone git@github.com:grupomediaset/$(REPO_PRJ).git
> @cp ${WORKSPACE}/ci/project.json ${DIR_APPS}/$(REPO_PRJ)/ci
> @echo "$(blue)>> Cambiando configuración K8s del projecto $(magenta)${PRJ_NAME}$(reset)"
> @cd ${DIR_APPS}/$(REPO_PRJ)/ci
> @[[ ${SISTEMA} != "Darwin" ]] && find ${DIR_APPS}/$(REPO_PRJ)/ci/k8s -name "*.yaml" -print | xargs sed -i "s/__PRJ_NAME__/${PRJ_NAME}/g"
> @[[ ${SISTEMA} == "Darwin" ]] && find ${DIR_APPS}/$(REPO_PRJ)/ci/k8s -name "*.yaml" -print | xargs sed -i '' "s/__PRJ_NAME__/${PRJ_NAME}/g"
> @[[ ${SISTEMA} != "Darwin" ]] && sed -i "s/__PRJ_NAME__/${PRJ_NAME}/" Jenkinsfile
> @[[ ${SISTEMA} == "Darwin" ]] && sed -i '' "s/__PRJ_NAME__/${PRJ_NAME}/" Jenkinsfile
> @cd ${DIR_APPS}/$(REPO_PRJ)
> @git add ci/*
> @git commit -m "change project.json and K8s files"
> @git push
> @cd ${WORKSPACE}
> @git checkout ci/project.json
> @rm -rf ${WORKSPACE}/ci/terraform/infra/.terraform ${WORKSPACE}/ci/terraform/infra/.terraform.lock.hcl ${WORKSPACE}/ci/terraform/infra/tmp_*


.PHONY: revertir-plantilla
revertir-plantilla:
> cd ${WORKSPACE}
> git checkout ci/project.json

# ============================================================================================
# Etiquetas desde el repo del Proyecto
# ============================================================================================

.PHONY: terraform-init
terraform-init:
> gmake terraform-init-infra && gmake terraform-init-deploy

.PHONY: terraform-init-infra
terraform-init-infra:
> @echo "$(blue)>> La información del projecto a desplegar: $(reset)"
> @echo "$(green)El proyecto es: $(magenta)${PRJ_NAME}$(reset)"
> @echo "$(green)El repositorio: $(reset)$(magenta)$(REPO_PRJ)$(reset)$(blue)"
> @echo "$(green)El directorio de aplicaciones en local es: $(reset)$(DIR_APPS)$(reset)$(blue)"
> @echo "$(blue)>> Inicializando terraform $(reset)infra del projecto $(magenta)${PRJ_NAME}$(reset)"
> cd ${DIR_APPS}/$(REPO_PRJ)/ci/terraform/infra
> echo "key=${APP_NAME}/${PRJ_NAME}/infra/terraform.tfstate"
> terraform init -backend-config="key=${APP_NAME}/${PRJ_NAME}/infra/terraform.tfstate"


.PHONY: terraform-init-deploy
terraform-init-deploy:
> @echo "$(blue)>> La información del projecto a desplegar: $(reset)"
> @echo "$(green)El proyecto es: $(magenta)${PRJ_NAME}$(reset)"
> @echo "$(green)El repositorio: $(reset)$(magenta)$(REPO_PRJ)$(reset)$(blue)"
> @echo "$(green)El directorio de aplicaciones en local es: $(reset)$(DIR_APPS)$(reset)$(blue)"
> @echo "$(blue)>> Inicializando terraform $(reset)deploy del projecto $(magenta)${PRJ_NAME}$(reset)"
> cd ${DIR_APPS}/$(REPO_PRJ)/ci/terraform/deploy
> echo "workspace_key_prefix=${APP_NAME}/${PRJ_NAME}/deploy"
> terraform init -backend-config="workspace_key_prefix=${APP_NAME}/${PRJ_NAME}/deploy"
> for w in 'int' 'pre' 'pro'; do terraform workspace new $${w}; done

.PHONY: crear-infra
crear-infra:
> gmake terraform-init-infra
> @echo "$(blue)>> La información del projecto a desplegar: $(reset)"
> @echo "$(green)El proyecto es: $(magenta)${PRJ_NAME}$(reset)"
> @echo "$(green)El repositorio: $(reset)$(magenta)$(REPO_PRJ)$(reset)$(blue)"
> @echo "$(green)El directorio de aplicaciones en local es: $(reset)$(DIR_APPS)$(reset)$(blue)"
> @echo "$(blue)>> Inicializando terraform $(reset)infra del projecto $(magenta)${PRJ_NAME}$(reset)"
> @echo "$(magenta)>> Creando infraestructura del projecto $(reset)$(magenta)$(PRJ_NAME)$(reset)"
> gmake generar-ecr && gmake generar-role-vault

.PHONY: generar-ecr
generar-ecr:
> @echo "$(blue)>> Generando ECR $(reset)$(magenta)$(PRJ_NAME)$(reset) en sharedservicespro$(blue) y su configuración$(reset)"
> cd ${WORKSPACE}/ci/terraform/infra
> terraform apply -var-file=../../project.json --target={aws_ecr_repository.repository,aws_ecr_repository_policy.eks_ecr_policy,aws_ecr_lifecycle_policy.last5images}

.PHONY: generar-role-vault
generar-role-vault:
> @echo "$(blue)>> Generando role para vault $(reset)$(magenta)$(PRJ_NAME)$(reset) en sharedservicespro$(blue) y su configuración$(reset)"
> cd ${WORKSPACE}/ci/terraform/infra
> terraform apply -var-file=../../project.json --target=vault_generic_secret.initial_path_secrets

# ============================================================================================
# Para generar el deploy en los workspaces es necesario hacerlo desde consla
# ============================================================================================

.PHONY: config-k8s
config-k8s:
> @cd ${DIR_APPS}/$(REPO_PRJ)/ci
> @echo "$(blue)>> Cambiando configuración K8s del projecto $(magenta)${PRJ_NAME}$(reset)"
> find k8s -name "*.yaml" -print | xargs sed -i '' "s/__PRJ_NAME__/${PRJ_NAME}/g"
> sed -i '' "s/__PRJ_NAME__/${PRJ_NAME}/" Jenkinsfile

# .PHONY: destroy-infra
# destroy-infra:
# > @echo "$(blue)>> Destruyendo infraestructura $(reset)$(magenta)$(PRJ_NAME)$(reset)"
# > cd ${WORKSPACE}/ci/terraform/infra
# > terraform destroy -var-file=../../project.json

.PHONY: exist-repo
exist-repo:
> @echo "$(green)El Repositorio es: $(magenta)${REPO_PRJ}$(reset)"
> if [[ `git ls-remote git@github.com:grupomediaset/euw1-mes-${DEV_TEAM}-${PRJ_NAME}.git` ]]; then echo "El repo existe"; fi