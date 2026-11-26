# Field components

Replacing a field's input with a component of your own, and reading the document from it. The field's config is in [Fields](./fields.md).

## Adding a field component

When the CMS cannot draw what a field needs, you draw it yourself - a product picked after a category, say, or a link with a switch that depends on the page. A field component is a React component of your Admin, registered under a name and attached to one field or several by a layout node.

Inside it everything is yours: as many inputs as you like, data fetched however you like. Out of it comes one value of each field's type, which a save checks as it checks any field. So a component never holds a new kind of data.

1. Register the component in the file that registers your options hooks. Give it a loader, so the Admin imports it when a form first shows it rather than when the Admin starts:

   ```ts
   // src/admin/cms/cms-extensions.ts
   import { defineCmsFieldComponent } from "@mostrajs/cms/admin-extensions"

   defineCmsFieldComponent("cta-link", {
     load: () => import("./cta-link.js").then((module) => ({ default: module.CtaLink })),
   })
   ```

2. Attach it in the layout, wherever a field can go - a section, a tab, a collapsible or a group:

   ```ts
   {
     type: "collapsible",
     label: "Link",
     fields: [{ type: "component", component: "cta-link", fields: ["cta_href", "cta_external"] }],
   }
   ```

3. Write the component. It gets every field under its key, and draws each one with the dashboard's own `Form` parts, bound to the CMS form by the field's `name`:

   ```tsx
   // src/admin/cms/cta-link.tsx
   import { type CmsFieldComponentProps, useDocumentValue } from "@mostrajs/cms/admin-extensions"
   import { Form } from "@medusajs/dashboard/components"
   import { Input, Switch } from "@medusajs/ui"

   export const CtaLink = ({ fields, inputProps, disabled }: CmsFieldComponentProps<"cta_href" | "cta_external">) => {
     const title = useDocumentValue((document) => document.fields.title)
     const isOffer = typeof title === "string" && title.toLowerCase().includes("offer")

     return (
       <div className="flex flex-col gap-y-4">
         <Form.Field
           name={inputProps.cta_href.name}
           render={({ field }) => (
             <Form.Item>
               <Form.Label optional={!fields.cta_href.required}>{fields.cta_href.label}</Form.Label>
               <Form.Control>
                 <Input {...field} value={field.value ?? ""} disabled={disabled} />
               </Form.Control>
               <Form.ErrorMessage />
             </Form.Item>
           )}
         />
         {!isOffer && (
           <Form.Field
             name={inputProps.cta_external.name}
             render={({ field: { value, onChange, ...field } }) => (
               <Form.Item>
                 <div className="flex items-center gap-x-3">
                   <Form.Control>
                     <Switch {...field} checked={value === true} onCheckedChange={onChange} disabled={disabled} />
                   </Form.Control>
                   <Form.Label>{fields.cta_external.label}</Form.Label>
                 </div>
                 <Form.ErrorMessage />
               </Form.Item>
             )}
           />
         )}
       </div>
     )
   }
   ```

### `defineCmsFieldComponent(name, component)`

Registers a component under the name a layout node gives. The second argument is a loader or the component itself:

- **A loader**, `{ load }` - `load` resolves to a module with the component as its default export, as `React.lazy` takes it. The Admin imports it when a form first shows the node.
- **The component as it is** - `defineCmsFieldComponent("cta-link", CtaLink)`. A small component given this way spares the editor a moment of `Loading`.

> [!NOTE]
> The `.js` path in the loader is what the Admin's Node16 resolution asks of a dynamic import; Vite resolves it to the `.tsx` source.

### The layout node

| Option | Type | Default | Description |
|---|---|---|---|
| `type` | `"component"` | - | Marks the node as a field component. |
| `component` | `string` | - | The name the component is registered under. |
| `fields` | `string[]` or `Record<string, string>` | - | The fields the component edits. |
| `label` | `CmsText` | - | A header over a node of several fields. |

`fields` takes one of two forms:

- **A list**, `fields: ["cta_href", "cta_external"]` - each field is handed to the component under its own name.
- **An object**, `fields: { color: "brand_color" }` - maps the component's keys to fields, to use one component for fields of different names.

What the CMS draws around the component depends on how many fields the node holds:

- **A node of one field** looks like the field: the CMS draws its label, description and error around the component.
- **A node of several** draws a header when it has a `label`, and the component draws every input, label and error of its fields.

### The component's props

Each prop is a record by key. `CmsFieldComponentProps<"cta_href" | "cta_external">` types the keys, so a typo fails the typecheck:

| Prop | What it holds |
|---|---|
| `values` | Each field's stored value, as its type holds it |
| `onChange(key, value)`, `onBlur(key)` | Write a field and mark it touched, for a component that does not use `Form.Field` |
| `fields` | Each field's config, shaped as below |
| `errors` | Each field's error message |
| `inputProps` | Each field's `name` in the form, and the `id`, `aria-*` and `ref` to spread on its main input, so the label and the error point at it and a failed save focuses it |
| `disabled` | Whether the CMS disabled one of its fields; draw the inputs disabled when it did |

Each entry of `fields` holds:

```ts
{
  label: string
  required?: "always" | "publish" // absent for an optional field
  options?: { value: string; label: string }[]
  multiple?: boolean
  max?: number
}
```

### When a component cannot show

The rest of the form works and saves in each of these cases:

- **No one registered the name** - the node shows `Unavailable: no component named "<name>" is registered` in its place.
- **The component throws, or its loader fails** - the node shows `Could not show this part of the form`.
- **The loader is still running** - the node shows the stored values disabled, with `Loading`.

### What a component cannot hold

- **A slug, a media or a unique field** cannot be drawn by a component; the config refuses such a node.
- **One value per field.** Whatever a component builds inside, it writes one value of the field's type. A nested structure has no column to go to; store a reference to a record of your own instead.

## Reading the document

A component reads the rest of the document, never writing it. Two hooks give it what it needs: `useDocumentValue` for the values, `useBlockPlace` for where the component sits.

### `useDocumentValue(select)`

Returns what the selector picks from the document. It renders the component again only when that pick changes, compared by content, so typing in another field costs nothing:

```ts
const title = useDocumentValue((document) => document.fields.title)
```

The document is shaped for components, not as the form holds it, as `CmsDocumentValue`:

```ts
type CmsDocumentValue = {
  fields: Record<string, unknown>
  areas: Record<string, CmsBlockValue[]> // each area's blocks, in order
}

type CmsBlockValue = {
  type: string
  fields: Record<string, unknown>
  areas: Record<string, CmsBlockValue[]>
}
```

Edge cases:

- **In the create form**, `fields` holds only the fields the form shows.
- **Outside a CMS document form**, `useDocumentValue` throws.

### `useBlockPlace()`

Returns the place of the block the component sits in, from the document down, so a component in a block finds its own block:

```json
[{ "area": "sections", "index": 2 }]
```

It returns `undefined` for a component of the document's own fields.
