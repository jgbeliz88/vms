# Se crea un Role IAM para Cuentas de Servicio (IRSA)
# https://docs.aws.amazon.com/es_es/emr/latest/EMR-on-EKS-DevelopmentGuide/setting-up-enable-IAM.html
# La Cuenta NAMESPACE:CUENTA se crea de tipo AssumeRoleWithWebIdentity contra el OIDC del Cluster EKS
# https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html


module "app-oidc-role" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  version = "5.1.0"

  create_role  = true
  role_name    = "${local.local_data.project_name}-${terraform.workspace}_IRSA"
  provider_url = replace(local.cluster_oidc[terraform.workspace], "https://", "")

  # role_policy_arns = [
  #   aws_iam_policy.policy-jenkins-eks.arn,
  #   aws_iam_policy.policy-assume-remote-roles.arn,
  #   aws_iam_policy.policy-route53.arn
  # ]

  oidc_fully_qualified_subjects = ["system:serviceaccount:${local.local_data.project_name}:${local.local_data.project_name}"]
}