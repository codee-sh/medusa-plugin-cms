# Field components

This page explains how to replace the input of a field with a component of your own, and how that component reads the document. The config of a field is in [Fields](./fields.md).

## Adding a field component

When the plugin cannot draw what a field needs, you draw it yourself. Examples are a product picked after a category, and a link with a switch that depends on the page. A field component is a React component in your Admin. You register it under a name, and a [layout node](#the-layout-node) attaches it to one field or several.

Inside the component, everything is yours: as many inputs as you like, and data fetched however you like. The component writes one value per field, of the type of that field. When the document is saved, the plugin checks each value as it checks any other field. So a component never holds a new kind of data.

1. Register the component in the file that registers your [options hooks](./fields.md#options-from-a-hook). Give it a loader, so that the Admin imports the component when a form first shows it, not when the Admin starts:

   ```ts
   // src/admin/cms/cms-extensions.ts
   import { defineCmsFieldComponent } from "@mostrajs/cms/admin-extensions"

   defineCmsFieldComponent("cta-link", {
     load: () => import("./cta-link.js").then((module) => ({ default: module.CtaLink })),
   })
   ```

2. Attach the component in the layout. It goes wherever a field can go, in a section, a tab, a collapsible, or a group:

   ```ts
   {
     type: "collapsible",
     label: "Link",
     fields: [{ type: "component", component: "cta-link", fields: ["cta_href", "cta_external"] }],
   }
   ```

3. Write the component. It receives each field under the key of that field. It draws each field with the dashboard's own `Form` parts. The `name` of the field binds each part to the document form:

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

Registers a component under the name that a layout node gives in `component`. The second argument is either a loader or the component itself:

- **A loader**, `{ load }` - `load` resolves to a module whose default export is the component, the shape that `React.lazy` takes. The Admin imports the module when a form first shows the node.
- **The component itself** - `defineCmsFieldComponent("cta-link", CtaLink)`. When you pass a small component this way, the editor does not see `Loading` for a moment.

> [!NOTE]
> The loader imports a `.js` path because the Node16 module resolution of the Admin requires it for a dynamic import. Vite resolves that path to the `.tsx` source.

### The layout node

| Option | Type | Default | Description |
|---|---|---|---|
| `type` | `"component"` | - | Marks the node as a field component. |
| `component` | `string` | - | The name that the component is registered under. |
| `fields` | `string[]` or `Record<string, string>` | - | The fields that the component edits. |
| `label` | `CmsText` | - | A header over a node of several fields. |
| `description` | `CmsText` | - | A text under the header, shown only when the node has a `label`. |

`fields` takes one of two forms:

- **A list**, `fields: ["cta_href", "cta_external"]` - the component receives each field under the name of that field.
- **An object**, `fields: { color: "brand_color" }` - maps the keys of the component to fields, so that one component can edit fields with different names.

What the plugin draws around the component depends on how many fields the node holds:

- **A node of one field** looks like the field. The plugin draws the label, the description, and the error of the field around the component.
- **A node of several fields** shows a header when it has a `label`. The component draws every input, label, and error of its fields.

### The component's props

`values`, `fields`, `errors`, and `inputProps` are records with one entry per key, and `onChange` and `onBlur` take a key. `CmsFieldComponentProps<"cta_href" | "cta_external">` types the keys, so a typo fails the typecheck:

| Prop | What it holds |
|---|---|
| `values` | The stored value of each field, as the type of the field holds it |
| `onChange(key, value)`, `onBlur(key)` | `onChange` writes a field and `onBlur` marks it as touched, for a component that does not use `Form.Field` |
| `fields` | The config of each field, shaped as below |
| `errors` | The error message of each field |
| `inputProps` | The `name` of each field in the form, and the `id`, `aria-*`, and `ref` to spread on the main input of the field. The label and the error then point at that input, and the form focuses it when saving fails |
| `disabled` | Whether the plugin disabled one of the fields of the component. When it did, draw the inputs disabled |

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

### When a component cannot be shown

In each of these cases, the rest of the form still works and saves:

- **No component is registered under the name** - the node shows `Unavailable: no component named "<name>" is registered` in place of the component.
- **The component throws, or its loader fails** - the node shows `Could not show this part of the form`.
- **The loader is still running** - the node shows the stored values disabled, with `Loading`.

### What a component cannot hold

- **No slug, media, `richtext`, or unique field.** A component cannot draw one of these fields, and the config refuses such a node. The plugin draws the input of a slug, a media, or a `richtext` field itself. It checks a unique value against the live documents as the editor types.
- **One value per field.** Whatever a component builds inside, it writes one value of the type of the field. A nested structure has no column to go to, so store a reference to a record of your own instead.

## Reading the document

A component can read the rest of the document, but never writes it. Two hooks give the component what it needs: `useDocumentValue` for the values, and `useBlockPlace` for where the component sits.

### `useDocumentValue(select)`

Returns what the selector picks from the document. The hook renders the component again only when the picked value changes, compared by content. So typing in another field costs nothing:

```ts
const title = useDocumentValue((document) => document.fields.title)
```

The hook gives the document as `CmsDocumentValue`, a shape made for components rather than the shape the form holds:

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

- **In the create form**, `fields` holds only the fields that the form shows.
- **Outside the plugin's document forms**, `useDocumentValue` throws.

### `useBlockPlace()`

Returns the place of the block that holds the component, as a path from the document down. A component in a block uses it to find its own block:

```json
[{ "area": "sections", "index": 2 }]
```

For a component on the document's own fields, `useBlockPlace` returns `undefined`.
