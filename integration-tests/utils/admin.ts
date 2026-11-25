import type {
  ConfigModule,
  IAuthModuleService,
  IUserModuleService,
  MedusaContainer,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  generateJwtToken,
} from "@medusajs/framework/utils"

const ADMIN_EMAIL = "admin@cms.test"

/**
 * Creates an admin user and signs a token for it with the app's JWT secret.
 *
 * @param container - The test app's container.
 * @returns Request options carrying the admin's bearer token.
 */
export const createAdminHeaders = async (container: MedusaContainer) => {
  const user = await container
    .resolve<IUserModuleService>(Modules.USER)
    .createUsers({ email: ADMIN_EMAIL })
  const authIdentity = await container
    .resolve<IAuthModuleService>(Modules.AUTH)
    .createAuthIdentities({
      provider_identities: [{ provider: "emailpass", entity_id: ADMIN_EMAIL }],
      app_metadata: { user_id: user.id },
    })
  const { jwtSecret } = container.resolve<ConfigModule>(
    ContainerRegistrationKeys.CONFIG_MODULE
  ).projectConfig.http

  const token = generateJwtToken(
    {
      actor_id: user.id,
      actor_type: "user",
      auth_identity_id: authIdentity.id,
      app_metadata: { user_id: user.id },
    },
    { secret: jwtSecret, expiresIn: "1d" }
  )

  return { headers: { authorization: `Bearer ${token}` } }
}
