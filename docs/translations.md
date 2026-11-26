# Translations

Translating your config's texts, and overriding the plugin's own.

## Translating the config's texts

The texts a config gives the Admin - collection and block labels, field labels and descriptions, option labels, section, tab, group, collapsible, component and area labels, and a `link` action's label - each take one of two forms:

- **a string**, shown as written in every language;
- **a function given `{ t }`**, run once at start, whose `t(key, options?)` names a translation the Admin shows in the editor's language.

```ts
import { type CmsText, defineConfig as defineCmsConfig } from "@mostrajs/cms"

/** A text of the project's own namespace. */
const text =
  (key: string): CmsText =>
  ({ t }) =>
    t(key)

export default defineCmsConfig({
  // The namespace `t` takes when it names none.
  admin: { translationNs: "content" },
  collections: [
    {
      slug: "page",
      labels: { singular: text("page.singular"), plural: "Pages" },
      fields: {
        title: { type: "text", label: text("page.fields.title") },
        // Medusa's own text, in its short form.
        created: {
          type: "date",
          label: ({ t }) => t("fields.createdAt", { ns: "translation", context: "short" }),
        },
      },
      // ...
    },
  ],
})
```

`t`'s options are i18next's - `context`, `count`, a value the text interpolates - each a text, a number or a boolean; `options.ns` names the namespace, any one, Medusa's `translation` included, as a text only reads it. Without `options.ns`, `t` takes `admin.translationNs`, and without both the start stops, naming the text. The function may also return a string, to keep that text plain.

The project's `src/admin/i18n/index.ts` holds its namespace next to its own `translation`, one tree per language:

```ts
import en from "./json/en.json"
import contentEn from "./json/content.en.json"
import contentPl from "./json/content.pl.json"

export default {
  en: { translation: en, content: contentEn },
  pl: { content: contentPl },
}
```

- `admin.translationNs` cannot be `translation`, `medusa-plugin-cms` or `manager-form-fields`: Medusa merges every extension's resources into one tree, so a project's key there would replace the dashboard's or the plugin's own.
- A key missing in the Admin's language falls back to English, then to Medusa's `translation` namespace, then shows as the key - so a gap is visible.
- A key is a leaf: `page` beside `page.singular` reads an object, which i18next reports instead of a text.
- A key holds no `:`: i18next reads `page:title` as the key `title` of a namespace `page`. A `.` nests, as above.
- A startup error about a translated text quotes its key.
- Options from a hook (`defineCmsOptionsHook`) are the hook's to translate.

## The plugin's own texts

The plugin's buttons, statuses, messages and form inputs come in English and Polish, in two namespaces: `medusa-plugin-cms` for the Content screens, and `manager-form-fields` for the form inputs, media included. Their keys are listed in `src/admin/i18n/json/en.json` and `src/admin/components/manager-form-fields/i18n/json/en.json`.

A project adds a language, or replaces a text, by writing the same namespace in its own `src/admin/i18n/index.ts`; the dashboard merges it over the plugin's:

```ts
export default {
  en: { "medusa-plugin-cms": { documents: { status: { published: "Live" } } } },
  de: { "medusa-plugin-cms": { documents: { status: { draft: "Entwurf" } } } },
}
```

A key a language lacks falls back to English.
