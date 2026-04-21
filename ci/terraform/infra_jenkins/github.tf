module "repos" {
  source = "git@github.com:grupomediaset/tf_module_euw1_mes-sm_github_repo?ref=0.1.11"
  # source = "/Users/deploy/app/tf_module_euw1_mes-sm_github_repo"

  providers = {
    github = github
    vault  = vault
  }

  name                   = "euw1-mes-${local.local_data.developers_team}-${local.local_data.project_name}"
  description            = local.local_data.project_description
  delete_branch_on_merge = true
  use_template           = true
  repo_template          = "mds-sm-app-template"

  app = local.local_data.project_name
  access = {
    "mediaset-aprobadores-${local.local_data.project_name}"      = "push"
    "mediaset-sistemas-multiplataforma" = "push"
  }

  use_pr = true
  patterns = ["main", "master", "dev", "release/*", "hotfix/*"]

  can_push = [
    "mediaset-aprobadores-${local.local_data.project_name}",
    "mediaset-sistemas-multiplataforma"
  ]
  parent_team_id = tonumber(local.local_data.terraform.approvers_parent_team)
  use_webhook = true
  webhook_events = [
    "check_run",
    "check_suite",
    "pull_request",
    "pull_request_review",
    "pull_request_review_comment",
    "pull_request_review_thread",
    "push",
    "status",
    "issue_comment"
  ]
  vulnerability_alerts = local.local_data.vulnerability_alerts

  depends_on = [github_team.mediaset-aprobadores]
}


resource "github_team" "mediaset-aprobadores" {
  name           = title("Mediaset - Aprobadores ${local.local_data.project_name}") # GitHub lo convierte a: @grupomediaset/mediaset-aprobadores-${local.local_data.project_name}
  description    = title("Aprobadores PR ${local.local_data.project_name}")
  privacy        = "closed"
  parent_team_id = local.local_data.terraform.approvers_parent_team # ---> local.local_data["terraform"]["approvers_parent_team"]
}

resource "github_team_membership" "grupomediaset" {
  for_each   = toset(local.local_data.terraform.approvers_members_team)

  team_id    = github_team.mediaset-aprobadores.id
  username   = each.value
  role       = "maintainer" # "member"

  depends_on = [github_team.mediaset-aprobadores]
}

resource "github_team_repository" "push-access-group" {
  for_each    = toset(local.local_data.terraform.push_group)
  team_id    = each.value
  repository = "euw1-mes-${local.local_data.developers_team}-${local.local_data.project_name}"
  permission = "push"
}










