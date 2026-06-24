#############################################
# 🔷 APP REGISTRATION - Mediaset VMS client
#############################################

data "azuread_client_config" "current" {}

resource "azuread_application" "vms_client_app" {
  display_name     = "Mediaset - VMS Client ${upper(substr(terraform.workspace, 0, 1))}${substr(terraform.workspace, 1, length(terraform.workspace))}"
  sign_in_audience = "AzureADMyOrg"
  logo_image       = filebase64("${path.module}/files/logo_vms.png")

  identifier_uris = ["api://${data.azuread_client_config.current.tenant_id}/vmsclient-${terraform.workspace}"]

  web {
    homepage_url  = "https://account.activedirectory.windowsazure.com:444/applications/default.aspx?metadata=customappsso|ISV9.1|primary|z"
    redirect_uris = local.redirect_uris

    implicit_grant {
      id_token_issuance_enabled = true
    }
  }

  api {
    oauth2_permission_scope {
      admin_consent_description  = "Allow the application to access Mediaset - VMS Client ${terraform.workspace} on behalf of the signed-in user."
      admin_consent_display_name = "Access Mediaset - VMS Client ${terraform.workspace}"
      id                         = "73a0db9d-6f08-4a5b-bd42-1a9251220a9e"
      enabled                    = true
      type                       = "User"
      user_consent_description   = "Allow the application to access Mediaset - VMS Client ${terraform.workspace} on your behalf."
      user_consent_display_name  = "Access Mediaset - VMS Client ${terraform.workspace}"
      value                      = "user_impersonation"
    }
  }

  dynamic "app_role" {
    for_each = local.app_roles
    content {
      allowed_member_types = ["User", "Application"]
      display_name         = app_role.key
      description          = app_role.value.description
      value                = app_role.value.value
      id                   = lookup(local.roles_uuids, app_role.value.value, uuid())
    }
  }
}

#############################################
# 🔷 SERVICE PRINCIPAL (Enterprise App)
#############################################

resource "azuread_service_principal" "mediaset_vms_sp" {
  client_id                     = azuread_application.vms_client_app.client_id
  app_role_assignment_required  = true
  preferred_single_sign_on_mode = "saml"
  notification_email_addresses  = ["T1AZ-CRUYRA@grupomediaset.onmicrosoft.com"]

  feature_tags {
    enterprise            = true
    custom_single_sign_on = true
  }
  # application_id = ""
}

# #############################################
# # 🔷 CERTIFICADO SAML
# #############################################

# # Genera una clave privada RSA
# resource "tls_private_key" "saml_key" {
#   algorithm = "RSA"
#   rsa_bits  = 2048
# }

# # Genera un certificado autofirmado X.509
# resource "tls_self_signed_cert" "saml_cert" {
#   private_key_pem = tls_private_key.saml_key.private_key_pem

#   subject {
#     common_name = "optimusclient-${terraform.workspace}"
#   }

#   validity_period_hours = 87600 # 10 años
#   is_ca_certificate     = false

#   allowed_uses = [
#     "key_encipherment",
#     "digital_signature",
#     "key_agreement",
#   ]
# }


# #############################################
# # 🔷 SUBIDA DEL CERTIFICADO AL SERVICE PRINCIPAL
# #############################################


# resource "azuread_service_principal_certificate" "optimus_saml_cert" {
#   service_principal_id = azuread_service_principal.mediaset_optimus_sp.id
#   type                 = "AsymmetricX509Cert"
#   value                = tls_self_signed_cert.saml_cert.cert_pem
# }


resource "azuread_service_principal_token_signing_certificate" "app_saml_cert" {
  service_principal_id = azuread_service_principal.mediaset_vms_sp.id
  display_name         = "CN=vms-client-sso-cert"
  # Choose the expiry date carefully, expired certificate will break user authentication.
  end_date = timeadd(timestamp(), "26280h") # 3 years from now

  lifecycle {
    ignore_changes = [
      # start_date,
      end_date,
      # key_id,
      # thumbprint,
      # value,
    ]
  }
}

#############################################
# 🔷 REDIRECT URIs
#############################################

locals {

  redirect_uris = [
    "http://localhost:3000/api/auth/callback/microsoft-entra-id",
    "https://vms-${terraform.workspace}.azrinternal.mediaset.es/api/auth/callback/microsoft-entra-id"
    # "https://doyfe-${local.environment}.awsinternal.mediaset.es/vmsClient/samlCallback",
    # "https://${local.local_data.project_name}-${local.environment}.awsinternal.mediaset.es/app"
  ]
}

#############################################
# 🔷 APP ROLES
#############################################

variable "roles_y_acciones" {
  type = map(list(string))
  default = {
    viewer    = ["vms_access_app","viewer"]
    operator   = ["vms_access_app", "vms_linear_actions", "vms_vod_actions", "viewer", "operator"]
    admin    = ["vms_access_app", "vms_linear_actions", "vms_vod_actions", "vms_live_manage_channels", "vms_live_manage_linears", "vms_fc_manage_channels", "vms_fc_manage_transitions", "vms_settings_page", "viewer", "operator", "admin"]
  }
}

locals {
  roles_uuids = {
    "viewer"                    = "b1d3c8a1-f2e4-4cbb-8a23-1f2d12345678"
    "operator"                  = "9c1744ec-5b45-4c56-9e6e-2f32456789ab"
    "admin"                     = "a72e4cbd-d8a3-46f8-b6ee-3d78456789ac"
    "vms_access_app"            = "c1e2f3d4-5a6b-7c8d-9e0f-1a2b3456789d"
    "vms_linear_actions"        = "d1e2f3d4-5a6b-7c8d-9e0f-1a2b3456789e"
    "vms_vod_actions"           = "e137f3d4-5a6b-7c8d-9e0f-1a2b34567891"
    "vms_live_manage_channels"  = "f1e2f3d4-5a6b-7c8d-9e0f-1a2b34567892"
    "vms_live_manage_linears"   = "a1e2f3d4-5a6b-7c8d-9e0f-1a2b34567893"
    "vms_fc_manage_channels"    = "c1e2f3d4-5a6b-7c8d-9e0f-1a2b34567894"
    "vms_fc_manage_transitions" = "d1e2f3d4-5a6b-7c8d-9e0f-1a2b34567895"
    "vms_settings_page"         = "e1e2f3d4-5a6b-7c8d-9e0f-1a2b34567896"
  }

  app_roles = {
    viewer = {
      description = "Permite realizar la acción viewer"
      value       = "viewer"
    }
    operator = {
      description = "Permite realizar la acción operator"
      value       = "operator"
    }
    admin = {
      description = "Permite realizar la acción admin"
      value       = "admin"
    }
    vms_access_app = {
      description = "Permite realizar la acción vms_access_app"
      value       = "vms_access_app"
    }
    vms_linear_actions = {
      description = "Permite realizar la acción vms_linear_actions"
      value       = "vms_linear_actions"
    }
    vms_vod_actions = {
      description = "Permite realizar la acción vms_vod_actions"
      value       = "vms_vod_actions"
    }
    vms_live_manage_channels = {
      description = "Permite realizar la acción vms_live_manage_channels"
      value       = "vms_live_manage_channels"
    }
    vms_live_manage_linears = {
      description = "Permite realizar la acción vms_live_manage_linears"
      value       = "vms_live_manage_linears"
    }
    vms_vod_actions = {
      description = "Permite realizar la acción vms_vod_actions"
      value       = "vms_vod_actions"
    }
    vms_fc_manage_channels = {
      description = "Permite realizar la acción vms_fc_manage_channels"
      value       = "vms_fc_manage_channels"
    }
    vms_fc_manage_transitions = {
      description = "Permite realizar la acción vms_fc_manage_transitions"
      value       = "vms_fc_manage_transitions"
    }
    vms_settings_page = {
      description = "Permite realizar la acción vms_settings_page"
      value       = "vms_settings_page"
    }
  }
}

#############################################
# 🔷 CLAIMS MAPPING POLICY (SAML)
#############################################

resource "azuread_claims_mapping_policy" "saml_claims" {
  display_name = "CustomSAMLClaims"

  definition = [
    jsonencode({
      ClaimsMappingPolicy = {
        Version = 1
        IncludeBasicClaimSet = false
        ClaimsSchema = [
          {
            ID              = "nameidentifier"
            SamlClaimType   = "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
            Source          = "user"
            SourceAttribute = "userPrincipalName"
          },
          {
            ID              = "email"
            SamlClaimType   = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
            Source          = "user"
            SourceAttribute = "mail"
          },
          {
            ID              = "givenname"
            SamlClaimType   = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"
            Source          = "user"
            SourceAttribute = "givenName"
          },
          {
            ID              = "surname"
            SamlClaimType   = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"
            Source          = "user"
            SourceAttribute = "surname"
          },
          {
            ID              = "role"
            SamlClaimType   = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role"
            Source          = "user"
            SourceAttribute = "assignedRoles"
          }
        ]
      }
    })
  ]
}

resource "azuread_service_principal_claims_mapping_policy_assignment" "assign" {
  service_principal_id     = azuread_service_principal.mediaset_vms_sp.id
  claims_mapping_policy_id = azuread_claims_mapping_policy.saml_claims.id
}

#############################################
# 🔷 GROUP → ROLE ASSIGNMENTS
#############################################

locals {
  grupo_a_roles_by_env = {
    # dev = {
    #   "G_Desarrollo_Multiplataforma" = {
    #     descripcion = "Acceso completo al entorno VMS."
    #     roles       = ["admin", "operator", "viewer"]
    #   }
    #   "T1-Operators_Multiplataforma" = {
    #     descripcion = "Acceso total a todas las categorías y funcionalidades."
    #     roles       = ["admin"]
    #   }
    # }

    pre = {
      "G_AZ_VMS_viewer" = {
        descripcion = "Acceso Viewer al entorno VMS."
        roles       = var.roles_y_acciones.viewer
      },
      "G_AZ_VMS_operator" = {
        descripcion = "Acceso Operator al entorno VMS."
        roles       = var.roles_y_acciones.operator
      },
      "G_AZ_VMS_admin" = {
        descripcion = "Acceso Admin al entorno VMS."
        roles       = var.roles_y_acciones.admin
      },
      "T1-Operators_Multiplataforma" = {
        descripcion = "Acceso total a todas las categorías y funcionalidades."
        roles       = var.roles_y_acciones.admin
      }
    }

    pro = {
      "G_AZ_VMS_admin" = {
        descripcion = "Acceso total a todas las categorías y funcionalidades productivas."
        roles       = ["admin", "viewer", "operator"]
      },
      "G_AZ_VMS_viewer" = {
        descripcion = "Permite únicamente la visualización de la actividad dentro del entorno VMS."
        roles       = ["viewer"]
      },
      "G_AZ_VMS_operator" = {
        descripcion = "Permite la visualización de la actividad y las métricas en el entorno VMS."
        roles       = ["viewer", "operator"]
      },
      "T1-Operators_Multiplataforma" = {
        descripcion = "Acceso total a todas las categorías y funcionalidades."
        roles       = ["admin", "operator", "viewer"]
      }
    }
  }
  grupo_ids_by_env = {
    pre = {
      "T1-Operators_Multiplataforma" = "2d7f54ce-9fba-44a4-9eac-5d479ba99126"
      "G_AZ_VMS_admin" = "14c55b61-67c4-4228-9eef-5e7cb4297951"
      "G_AZ_VMS_viewer" = "168d3ef6-1647-4211-a67c-fb77fe9c8b50"
      "G_AZ_VMS_operator" = "0c396c04-f2b2-42a0-9eab-43588ce8622c"
    }
    pro = {
      "G_AZ_VMS_admin" = "14c55b61-67c4-4228-9eef-5e7cb4297951"
      "G_AZ_VMS_viewer" = "168d3ef6-1647-4211-a67c-fb77fe9c8b50"
      "G_AZ_VMS_operator" = "0c396c04-f2b2-42a0-9eab-43588ce8622c"
      "T1-Operators_Multiplataforma" = "2d7f54ce-9fba-44a4-9eac-5d479ba99126"
    }
  }

  grupo_a_roles = lookup(local.grupo_a_roles_by_env, terraform.workspace, {})
  grupo_ids     = lookup(local.grupo_ids_by_env, terraform.workspace, {})

  grupo_role_asignaciones = flatten([
    for grupo, data in local.grupo_a_roles : [
      for rol in data.roles : {
        group_name = grupo
        group_id   = lookup(local.grupo_ids, grupo, null)
        role_name  = rol
        role_id    = lookup(local.roles_uuids, rol, null)
      }
      if lookup(local.grupo_ids, grupo, null) != null
    ]
  ])
}

resource "azuread_app_role_assignment" "group_role_assignments" {
  for_each = {
    for r in local.grupo_role_asignaciones :
    "${r.group_id}-${r.role_id}" => r
    if r.role_id != null
  }

  principal_object_id = each.value.group_id
  app_role_id         = each.value.role_id
  resource_object_id  = azuread_service_principal.mediaset_vms_sp.object_id
}

# create client secret for the service principal (if needed for non-interactive login scenarios, e.g., CI/CD pipelines)
resource "azuread_application_password" "client_secret" {
  application_id = azuread_application.vms_client_app.id
  display_name   = "Client Secret for ${azuread_application.vms_client_app.display_name}"
  end_date              = timeadd(timestamp(), "17520h")

  lifecycle {
    ignore_changes = [
      end_date,
      start_date
    ]
  }
}

# para saber el valor del client secret, ejecutar terraform apply y luego terraform output client_secret

# output "client_secret" {
#   value     = azuread_application_password.client_secret.value
#   sensitive = true
# }