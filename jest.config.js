module.exports = {
  transform: {
    "^.+\\.[jt]s$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", decorators: true },
        },
      },
    ],
  },
  // Lexical ships ES modules only, so its packages are compiled for the rich text editor's tests too.
  transformIgnorePatterns: ["/node_modules/(?!(lexical|@lexical)/)"],
  testEnvironment: "node",
  moduleFileExtensions: ["js", "ts", "tsx", "json"],
  modulePathIgnorePatterns: ["dist/", "<rootDir>/.medusa/"],
}

if (process.env.TEST_TYPE === "integration:http") {
  module.exports.testMatch = ["**/integration-tests/http/**/*.spec.[jt]s"]
  module.exports.setupFiles = ["./integration-tests/setup.js"]
} else if (process.env.TEST_TYPE === "integration:modules") {
  module.exports.testMatch = [
    "**/src/modules/*/__tests__/**/*.integration.spec.[jt]s",
  ]
  module.exports.setupFiles = ["./integration-tests/setup.js"]
} else {
  module.exports.testMatch = ["**/__tests__/**/*.unit.spec.[jt]s"]
}
