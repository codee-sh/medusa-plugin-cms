import path from "path"
import { defineConfig, Modules } from "@medusajs/framework/utils"
import { buildTestConfig } from "./integration-tests/modules/test-content/cms-config"

/**
 * The app the integration tests run: the plugin's own `src` with the `cms` module, and a test module
 * holding the content models. It is not part of the published package. The Caching Module is on, as in
 * a host project, so the tests see what the store's cached reads and their invalidation do.
 */
export default defineConfig({
  featureFlags: {
    caching: true,
  },
  projectConfig: {
    http: {
      adminCors: "",
      authCors: "",
      storeCors: "",
      jwtSecret: "test",
      cookieSecret: "test",
    },
  },
  modules: {
    [Modules.CACHING]: {
      resolve: "@medusajs/medusa/caching",
      options: { in_memory: { enable: true } },
    },
    // Absolute: Medusa resolves a "./" path that does not start with "./src" inside "src".
    testContent: {
      resolve: path.join(__dirname, "integration-tests/modules/test-content"),
    },
    cms: {
      resolve: "./src/modules/cms",
      options: { config: buildTestConfig() },
    },
  },
})
