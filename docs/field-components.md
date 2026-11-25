# Field components

Replacing a field's input with a component of your own, and reading the document from it. The field's config is in [Fields](./fields.md).

## Adding a field component

When the CMS cannot draw what a field needs - a product picked after a category, a link with a switch that depends on the page - you draw it yourself. A field component is a React component of your Admin, registered under a name and attached to one field or several by a layout node. Inside it everything is yours: as many inputs as you like, data fetched however you like. Out of it comes one value of each field's type, which a save checks as it checks any field, so a component never holds a new kind of data.

1. Register the component in the file that registers your options hooks. Give it a loader, so the Admin imports it when a form first shows it rather than when the Admin starts:

   ```ts
   // src/admin/cms/cms-extensions.ts
   import { defineCmsFieldComponent } from "@codee-sh/medusa-plugin-cms/admin-extensions"

   defineCmsFieldComponent("cta-link", {
     load: () => import("./cta-link.js").then((module) => ({ default: module.CtaLink })),
   })
   ```

   `load` resolves to a module with the component as its default export, as `React.lazy` takes it. The `.js` path is what the Admin's Node16 resolution asks of a dynamic import; Vite resolves it to the `.tsx` source. A small component can be given as it is, `defineCmsFieldComponent("cta-link", CtaLink)`, which spares the editor a moment of `Loading`.

2. Attach it in the layout, wherever a field can go - a section, a tab, a collapsible or a group:

   ```ts
   {
     type: "collapsible",
     label: "Link",
     fields: [{ type: "component", component: "cta-link", fields: ["cta_href", "cta_external"] }],
   }
   ```

   `fields` lists the fields the component edits, each handed to it under its own name. To use one component for fields of different names, map the component's keys to fields instead: `fields: { color: "brand_color" }`. A node of one field looks like the field: the CMS draws its label, description and error around the component. A node of several draws a header when it has a `label`, and the component draws every input, label and error of its fields.

3. Write the component. It gets every field under its key, and draws each one with the dashboard's own `Form` parts, bound to the CMS form by the field's `name`:

   ```tsx
   // src/admin/cms/cta-link.tsx
   import { type CmsFieldComponentProps, useDocumentValue } from "@codee-sh/medusa-plugin-cms/admin-extensions"
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

The props, each a record by key; `CmsFieldComponentProps<"cta_href" | "cta_external">` types the keys, so a typo fails the typecheck:

| Prop | What it holds |
|---|---|
| `values` | Each field's stored value, as its type holds it |
| `onChange(key, value)`, `onBlur(key)` | Write a field and mark it touched, for a component that does not use `Form.Field` |
| `fields` | Each field's `label`, `required` (`"always"`, `"publish"`, or absent), `options`, `multiple`, `max` |
| `errors` | Each field's error message |
| `inputProps` | Each field's `name` in the form, and the `id`, `aria-*` and `ref` to spread on its main input, so the label and the error point at it and a failed save focuses it |
| `disabled` | Whether the CMS disabled one of its fields; draw the inputs disabled when it did |

What to know:

- **A name no one registered** shows `Unavailable: no component named "<name>" is registered` in place of the node. A component that throws, or a loader that fails, shows `Could not show this part of the form`. Either way the rest of the form works and saves. While a loader runs, the node shows the stored values disabled, with `Loading`.
- **A slug, a media or a unique field** cannot be drawn by a component; the config refuses such a node.
- **One value per field.** Whatever a component builds inside, it writes one value of the field's type. A nested structure has no column to go to; store a reference to a record of your own instead.

## Reading the document

A component reads the rest of the document, never writing it, with `useDocumentValue`. It takes a selector and renders the component again only when what the selector picks changes, compared by content, so typing in another field costs nothing:

```ts
const title = useDocumentValue((document) => document.fields.title)
```

The document is shaped for components, not as the form holds it: `{ fields, areas }`, with each area's blocks in order as `{ type, fields, areas }`. A component in a block finds its own block with `useBlockPlace()`, which returns its place from the document down, `[{ area: "sections", index: 2 }]`, and `undefined` for the document's own fields. In the create form `fields` holds only the fields the form shows. Outside a CMS document form `useDocumentValue` throws.
