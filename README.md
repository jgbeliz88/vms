# github_ci_template

Plantilla para unir aplicación y ci en el mismo repositorio.
Los ficheros contienen lo básico. Hay que completar según proyectos:

- `CODEOWNERS`: Contenido que requiere aprobación de una persona o equipo concreto cada vez que se modifica.
- `.dockerignore`: Ficheros y directorios que los comandos `ADD` y `COPY` de un *Dockerfile* deben ignorar.
- `.gitattributes`: Atributos de ficheros y directorios a nivel de `git`. Se utiliza como el `.dockerignore`, pero para `git`.
- `.gitignore`: Ficheros y directorios que deben ser ignorados por el control de versiones y no deben subir a los repositorios.

## Estructura de ficheros DEV

*DEV*

## Estructura de ficheros OPS

Además del contenido básico en los ficheros `CODEOWNERS`, `.dockerignore`, `.gitattributes` y `.gitignore`, el contenido *OPS* está almacenado en el subdirectorio `ci/` de la siguiente forma:

- `ci/config`: Configuración que forma parte del despliegue. Es configuración de la aplicación que será editada por ambas partes. Por parte de *OPS* se insertarán en las configuraciones los marcadores necesarios para sustituir por datos reales en el momento el despliegue. Por la parte de *DEV* se gestionarán las configuraciones en sí, respetando los marcadores a sustituir en despliegue.
- `ci/terraform`: Código de terraform para el despliegue de la infraestructura específica del proyecto.


git ls-remote git@github.com:grupomediaset/euw1-mes-dm-$(jq -r '.project_name' ../../project.json).git

Modificar project.json
cd /Users/deploy/app/mds-sm-app-template/ci/terraform/infra
terraform init -backend-config="key=$(jq -r '.app' ../../project.json)/$(jq -r '.project_name' ../../project.json)/$(pwd |awk -F/ '{print $(NF)}')/terraform.tfstate"
# terraform apply -var-file=../../project.json
terraform plan -out=plan.tfplan -input=false
terraform apply -input=false plan.tfplan
git clone git@github.com:grupomediaset/euw1-mes-dm-$(jq -r '.project_name' ../../project.json).git /Users/deploy/app/euw1-mes-dm-$(jq -r '.project_name' ../../project.json)
cp ../../project.json /Users/deploy/app/euw1-mes-dm-$(jq -r '.project_name' ../../project.json)/ci/project.json
rm -Rf .terraform
git checkout ../../project.json
cd /Users/deploy/app/euw1-mes-dm-$(jq -r '.project_name' ../../project.json)/ci/terraform/infra/
terraform init -backend-config="key=$(jq -r '.app' ../../project.json)/$(jq -r '.project_name' ../../project.json)/$(pwd |awk -F/ '{print $(NF)}')/terraform.tfstate"
terraform plan -var-file=../../project.json
git add ../../project.json
git commit -m "First commit. Terraform Infra"
git push
