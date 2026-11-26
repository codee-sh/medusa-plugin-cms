# Validation

This page covers rules that check a model's fields together, and your own rules that refuse a write. [Fields](./fields.md#a-fields-config) covers the schemas of a single field.

## Rules over a model's fields

A field's schemas check only that field. When a check needs several fields, such as a button label that needs a link, it is a rule of the model. Model rules go in `serverValidation` and `serverPublishValidation`, next to `fields`, on a collection or a block type. Each key takes a Zod object schema over the model's own fields:

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
| `serverValidation` | Every time a document is saved, drafts included, and in the Admin's live validation while the editor types. |
| `serverPublishValidation` | In addition to `serverValidation` when a document is published, and at every save in a collection without drafts, which is live at once. |

A rule runs only after every field of the model has passed its own checks, so no field is reported twice. A `serverPublishValidation` error appears when publishing is refused, in the same way as an error from a field's publish schema.

### What a rule gets

- **Every field of the model**, by name, in the same form as a field's schema gets them:
  - an empty value as `null`
  - a date as ISO text
- **A block's rule** sees only that block's fields, never the document's fields or another block's.
- **No data.** A rule runs synchronously and sees only the values. A check against other records belongs in a [`validate` hook](#your-own-rules-at-a-write).

### Where the error lands

- **At the field that the issue's `path` names.** In the example, the error shows under **Button link** in the block. The tab that holds the field shows the error count.
- **An issue with no field in its path** is an error of the model itself. A block's rule shows it on the block, and a document's rule shows it in the toast.

A field that a rule requires still shows **(Optional)** in its label, as the field's own schema lets it stay empty. The rule's error says when the field is needed.

> [!TIP]
> When a component hides or shows a field under the same condition that a rule checks, keep the condition in one function. Call that function from both places, as the example does with `isButtonWithoutLink`.

### When the config refuses a rule

- **The rule does not describe an object.**
- **The rule names a key that is not a field of the model.**

## Your own rules at a write

Some rules cannot live in the config, such as one that reads other records or data the plugin does not know. Such a rule goes into the `validate` hook of a write workflow. The handler you attach refuses the write by throwing an error:

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

| Workflow | The handler runs when |
|---|---|
| `createCmsDocumentWorkflow` | a document is created |
| `updateCmsDocumentWorkflow` | a document is saved, or a version is restored, with `input.change_type` set to `"restore"` |
| `publishCmsDocumentWorkflow` | a document is published |
| `unpublishCmsDocumentWorkflow` | a document is unpublished |
| `deleteCmsDocumentWorkflow` | a document is deleted |

Discarding changes and the Admin's live validation run no handler.

### What the handler gets

```ts
{
  input, // the workflow's input
  collection, // the collection's slug
  document, // the document as stored; null in a create
}
```

- **Every collection.** One handler serves every collection, so it returns early for the collections it does not guard.
- **A published document.** For a published document, the stored row in `document` is the live content, not the draft.
- **Unpublishing.** When a document is unpublished, `document` comes without its areas.

### When the handler runs

- **Once per write**, after the plugin's own checks and before anything is written. When the handler refuses the write, there is nothing to undo, and the workflow emits no event.
- **In an update, before the body is checked.** `input.document` holds what the editor sent.
- **In the request.** Keep the handler to a check. Put a side effect that follows a write in a subscriber to the `cms.document.*` events.

### Refusing a write

To refuse a write, throw a `MedusaError`, with the type `NOT_ALLOWED` for a broken rule. The route answers `400`, and the Admin shows the error's message in the toast. You write the message, in your editors' language.

### One handler per hook

Medusa takes one handler per hook, so combine your rules in that handler. When two writes share a rule, write the rule as one function and call it from both handlers. In the example above, `validatePageNotInUse` refuses both unpublishing and deleting a page that is in use.

> [!WARNING]
> The handler attaches to the workflow you import. Import the workflow from `@mostrajs/cms/workflows`, and make sure that import resolves to the copy Medusa loads. If `node_modules` holds a second copy of the package, that copy takes the handler without an error, and the plugin's routes never run it.
