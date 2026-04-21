locals {
  local_data = jsondecode(file("${path.module}/../../project.json"))
}

locals {
  region = "eu-west-1"

  aws_default_tags = {
#    repo         = module.repos.repo_id
    project_name = local.local_data.project_name
    owner        = "Multiplataforma"
    iac          = "terraform"
  }
}

