---
{"title": "A module service in a step hides its class statics", "modules": [], "areas": ["backend"], "topics": ["workflows"]}
---

# A module service in a step hides its class statics

Inside a workflow step, `container.resolve(<module>)` does not return the module's service but a Proxy.
`LocalWorkflow.contextualizedMedusaModules` (`@medusajs/orchestration` 2.22.7,
`dist/workflow/local-workflow.js:51-84`) wraps every service whose class is a Medusa module, and its `get`
trap returns each function property as a new arrow function that injects the transaction context.
`constructor` is a function property too, so `service.constructor` in a step is that arrow, and every
static of the class reads as `undefined` - `MedusaServiceModelObjectsSymbol`, the map of the service's
DML models, among them.

The same read works in a route, a script or a unit test, where the container returns the service
itself, so it passes every check that does not run a workflow. The CMS registry read its models that
way: `GET /admin/cms/health` answered, while every workflow failed with a model "not in module".

Do not read class statics, or anything through `constructor`, off a module service a step may resolve.
Pass what is needed in, as the CMS config passes its DML models. Calling the service's methods through
the Proxy is fine.
