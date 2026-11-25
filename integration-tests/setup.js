const { MetadataStorage } = require("@mikro-orm/core")
const { loadEnv } = require("@medusajs/framework/utils")

MetadataStorage.clear()
loadEnv("test", process.cwd())

// The test runner creates and drops a database per run through these; they match docker-compose.test.yml.
process.env.DB_HOST ??= "localhost"
process.env.DB_USERNAME ??= "postgres"
process.env.DB_PASSWORD ??= "postgres"
