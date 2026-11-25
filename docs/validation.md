# Validation

Rules over a model's fields together, and your own rules at a write. A single field's schemas are in [Fields](./fields.md#a-fields-config).

## Rules over a model's fields

A field's schemas check that field alone. A check that needs several fields - a button label that needs a link - is a rule of the model: `serverValidation` and `serverPublishValidation` beside `fields`, on a collection or a block type. Each is a Zod object schema over the model's own fields:

```ts
// src/cms/config.ts
const isButtonWithoutLink = (button: { cta_label: string | null; cta_href: string | null }): boolean =>
  Boolean(button.cta_label) && !button.cta_href

const BUTTON_LINK_RULE = z
  .object({ cta_label: z.string().nullable(), cta_href: z.string().nullable() })
  .refine((button) => !isButtonWithoutLink(button), {
    path: ["cta_href"],
    message: "Add a link for the button",
  })

{
  slug: "image_text",
  model: ContentBlockImageText,
  fields: { /* ... */ },
  serverPublishValidation: BUTTON_LINK_RULE,
}
```

- **What a rule gets.** Every field of its model by name, an empty value as `null` and a date as its ISO text, as a field's schema gets them. A block's rule sees that block's fields only, never the document's or another block's.
- **When it runs.** `serverValidation` at every save, a draft's included; `serverPublishValidation` besides it at a publish, and at every save of a published document. A rule waits until each of its model's fields passed its own checks, so a field is never reported twice. The Admin's live validation, while the editor types, runs `serverValidation`; a `serverPublishValidation` error shows when a publish is refused, as a field's publish schema does.
- **Where the error lands.** At the field the issue's `path` names - here under "Button link", in the block, with the count on its tab. An issue with no field in its path is the model's own error: on the block, or in the toast for a document's rule.
- **The label stays.** A field a rule requires keeps its `(Optional)` label, as its own schema lets it stay empty; the error says when it is needed.
- **It reads no data.** A rule runs synchronously, on the values alone. A check against other records belongs in a [`validate` hook](#your-own-rules-at-a-write).
- **One condition, two places.** When a component hides or shows a field under the same condition a rule checks, keep the condition in one function of yours and call it from both, as `isButtonWithoutLink` above.

The config refuses a rule that does not describe an object, or that names a key that is no field of the model.

## Your own rules at a write

A rule the config cannot hold - one that reads other records, or data the CMS does not know - goes into the `validate` hook of a write workflow: `createCmsDocumentWorkflow`, `updateCmsDocumentWorkflow`, `publishCmsDocumentWorkflow`, `unpublishCmsDocumentWorkflow` or `deleteCmsDocumentWorkflow`. Its handler refuses the write by throwing:

```ts
// src/workflows/hooks/cms-documents.ts
import type { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import {
  deleteCmsDocumentWorkflow,
  listCmsReferencesWorkflow,
  unpublishCmsDocumentWorkflow,
} from "@codee-sh/medusa-plugin-cms/workflows"

// A page another document links to stays published and in place.
const validatePageNotInUse = async (
  container: MedusaContainer,
  collection: string,
  id: string
): Promise<void> => {
  if (collection !== "page") {
    return
  }

  const { result: references } = await listCmsReferencesWorkflow(container).run({
    input: { collection, id },
  })

  if (references.length > 0) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "This page is linked from other content")
  }
}

deleteCmsDocumentWorkflow.hooks.validate(async ({ collection, document }, { container }) => {
  await validatePageNotInUse(container, collection, document.id)
})

unpublishCmsDocumentWorkflow.hooks.validate(async ({ collection, document }, { container }) => {
  await validatePageNotInUse(container, collection, document.id)
})
```

- **What it gets.** `{ input, collection, document }`: the workflow's input, the collection's slug and the document as stored, `null` in a create. A handler serves every collection, so it returns early for the ones it does not guard. For a published document the stored row is the live content, not the draft; in an unpublish it comes without its areas.
- **When it runs.** Once per write, after the plugin's own checks and before the first write, so a refusal leaves nothing to undo and emits no event. In an update it runs before the body is checked: `input.document` is what the editor sent. A restore runs the update's handler, `input.change_type` being `"restore"`; a discard and the Admin's live validation run none.
- **One handler per hook.** Medusa takes one, so combine your rules in it. A rule two writes share - a page in use, refused at an unpublish and at a delete - is one function of yours called from both, as above.
- **The error.** Throw a `MedusaError`, `NOT_ALLOWED` for a rule: the route answers `400` and the Admin shows its message in the toast. The message is yours, in your editors' language.
- **It runs in the request.** Keep it to a check. A side effect after a write belongs in a subscriber to the `cms.document.*` events.
- **One copy of the plugin.** The handler attaches to the workflow you import. Import it from `@codee-sh/medusa-plugin-cms/workflows`, resolved to the copy Medusa loads: a second copy of the package in `node_modules` takes the handler without an error, and the plugin's routes never run it.
