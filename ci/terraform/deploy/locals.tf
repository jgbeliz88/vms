locals {
  local_data = jsondecode(file("${path.module}/../../project.json"))
}

locals {
  region = "eu-west-1"

  account_id = data.aws_caller_identity.current.account_id

  account_number = {
    int = "066689617337"
    pre = "780954797060"
    pro = "420526096563"
  }


#  deploy_roles = {
#    int = data.terraform_remote_state.bootstrap.outputs.eks-int_account
#    pre = data.terraform_remote_state.bootstrap.outputs.eks-pre_account
#    pro = data.terraform_remote_state.bootstrap.outputs.eks-pro_account
#  }
#
#  deploy_role = coalesce(
#    var.deploy_role_arn,
#    local.deploy_roles[terraform.workspace]
#  )

#  stage = (terraform.workspace == "pro" ? "pro" : "pre")

  aws_default_tags = {
    repo         = "euw1-mes-dm-${local.local_data.project_name}"
    app          = local.local_data.app
    project_name = local.local_data.project_name
    owner        = "Multiplataforma"
    iac          = "terraform"
    workspace    = terraform.workspace
    env          = terraform.workspace
#    stage        = local.stage
  }
#
  cluster_name = {
    int = data.terraform_remote_state.eks_global_multiint.outputs.cluster_name
    pre = data.terraform_remote_state.eks_global_multipre.outputs.cluster_name
    pro = data.terraform_remote_state.eks_global_multipro.outputs.cluster_name
  }

  cluster_oidc = {
    int = data.terraform_remote_state.eks_global_multiint.outputs.cluster_oidc_issuer_url
    pre = data.terraform_remote_state.eks_global_multipre.outputs.cluster_oidc_issuer_url
    pro = data.terraform_remote_state.eks_global_multipro.outputs.cluster_oidc_issuer_url
  }
#
#  cluster_vpc = {
#    int = data.terraform_remote_state.eks-multiint121.outputs.cluster_vpc
#    pre = data.terraform_remote_state.eks-multipre121.outputs.cluster_vpc
#    pro = data.terraform_remote_state.eks-multipro.outputs.cluster_vpc
#  }
#
#  cluster_subnets = {
#    int = data.terraform_remote_state.eks-multiint121.outputs.cluster_subnets
#    pre = data.terraform_remote_state.eks-multipre121.outputs.cluster_subnets
#    pro = data.terraform_remote_state.eks-multipro.outputs.cluster_subnets
#  }
#
#  cluster_public_subnets = {
#    int = data.terraform_remote_state.eks-multiint121.outputs.cluster_public_subnets
#    pre = data.terraform_remote_state.eks-multipre121.outputs.cluster_public_subnets
#    pro = data.terraform_remote_state.eks-multipro.outputs.cluster_public_subnets
#  }
#
#  cluster_worker_sg = {
#    int = data.terraform_remote_state.eks-multiint121.outputs.cluster_worker_sg
#    pre = data.terraform_remote_state.eks-multipre121.outputs.cluster_worker_sg
#    pro = data.terraform_remote_state.eks-multipro.outputs.cluster_worker_sg
#  }
#

}
