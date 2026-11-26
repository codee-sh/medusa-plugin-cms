# Validation

Rules over a model's fields together, and your own rules at a write. A single field's schemas are in [Fields](./fields.md#a-fields-config).

## Rules over a model's fields

A field's schemas check that field alone. A check that needs several fields - a button label that needs a link - is a rule of the model. It goes in `serverValidation` and `serverPublishValidation` beside `fields`, on a collection or a block type. Each is a Zod object schema over the model's own fields:

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

### When a rule runs

| Rule | Runs |
|---|---|
| `serverValidation` | At every save, a draft's included, and in the Admin's live validation while the editor types. |
| `serverPublishValidation` | Besides `serverValidation` at a publish, and at every save of a published document. |

A rule waits until each of its model's fields passed its own checks, so a field is never reported twice. A `serverPublishValidation` error shows when a publish is refused, as a field's publish schema does.

### What a rule gets

- **Every field of its model** by name, as a field's schema gets them:
  - an empty value as `null`
  - a date as its ISO text
- **A block's rule** sees that block's fields only, never the document's or another block's.
- **No data.** A rule runs synchronously, on the values alone. A check against other records belongs in a [`validate` hook](#your-own-rules-at-a-write).

### Where the error lands

- **At the field the issue's `path` names.** In the example, under "Button link", in the block, with the count on its tab.
- **An issue with no field in its path** is the model's own error: on the block, or in the toast for a document's rule.

A field a rule requires keeps its `(Optional)` label, as its own schema lets it stay empty; the error says when it is needed.

> [!TIP]
> When a component hides or shows a field under the same condition a rule checks, keep the condition in one function of yours. Call it from both, as `isButtonWithoutLink` above.

### When the config refuses a rule

- **The rule does not describe an object.**
- **The rule names a key that is no field of the model.**

## Your own rules at a write

A rule the config cannot hold - one that reads other records, or data the CMS does not know - goes into the `validate` hook of a write workflow. Its handler refuses the write by throwing:

```ts
// src/workflows/hooks/cms-documents.ts
import type { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import {
  deleteCmsDocumentWorkflow,
  listCmsReferencesWorkflow,
  unpublishCmsDocumentWorkflow,
} from "@mostrajs/cms/workflows"

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

### The write workflows

| Workflow | Its handler runs at |
|---|---|
| `createCmsDocumentWorkflow` | a create |
| `updateCmsDocumentWorkflow` | a save, and a restore, with `input.change_type` being `"restore"` |
| `publishCmsDocumentWorkflow` | a publish |
| `unpublishCmsDocumentWorkflow` | an unpublish |
| `deleteCmsDocumentWorkflow` | a delete |

A discard and the Admin's live validation run no handler.

### What the handler gets

```ts
{
  input, // the workflow's input
  collection, // the collection's slug
  document, // the document as stored; null in a create
}
```

- **Every collection.** A handler serves every collection, so it returns early for the ones it does not guard.
- **A published document.** The stored row is the live content, not the draft.
- **An unpublish.** The document comes without its areas.

### When the handler runs

- **Once per write**, after the plugin's own checks and before the first write. A refusal leaves nothing to undo and emits no event.
- **In an update, before the body is checked.** `input.document` is what the editor sent.
- **In the request.** Keep it to a check. A side effect after a write belongs in a subscriber to the `cms.document.*` events.

### Refusing a write

Throw a `MedusaError`, `NOT_ALLOWED` for a rule: the route answers `400` and the Admin shows its message in the toast. The message is yours, in your editors' language.

### One handler per hook

Medusa takes one handler per hook, so combine your rules in it. A rule two writes share - a page in use, refused at an unpublish and at a delete - is one function of yours called from both, as above.

> [!WARNING]
> The handler attaches to the workflow you import. Import it from `@mostrajs/cms/workflows`, resolved to the copy Medusa loads. A second copy of the package in `node_modules` takes the handler without an error, and the plugin's routes never run it.
