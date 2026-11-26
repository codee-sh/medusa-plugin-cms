# Translations

This page covers how you translate the texts of your config, and how you override the texts the plugin ships.

## Translating the config's texts

Each text that your config gives the Admin takes one of two forms:

- **A string** - the Admin shows it as written, in every language.
- **A function given `{ t }`** - the plugin runs it once, when Medusa starts. The function calls `t(key, options?)` to name a translation, which the Admin shows in the editor's language.

```ts
// src/cms/config.ts
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

### The texts a config gives the Admin

Each of these texts takes either form:

- collection and block labels
- field labels and descriptions
- option labels
- section, tab, group, collapsible, component, and area labels
- a `link` action's label

### `t(key, options?)`

`t` names a translation that the Admin shows in the editor's language. The function given `{ t }` may also return a string, and the Admin then shows that text as written.

```ts
// exported from @mostrajs/cms
type CmsText = string | ((params: { t: CmsTranslate }) => string | TranslatedText)

type CmsTranslate = (
  key: string,
  options?: TranslationOptions & { ns?: string }
) => TranslatedText

type TranslationOptions = Record<string, string | number | boolean>
```

`t` takes the options of i18next:

| Option | Type | Default | Description |
|---|---|---|---|
| `ns` | `string` | `admin.translationNs` | The namespace to read the text from. Any namespace works, Medusa's `translation` included, because a text only reads it. |
| `context`, `count`, a value the text interpolates | `string`, `number`, or `boolean` | - | i18next's own options. |

Without `options.ns`, `t` takes `admin.translationNs`. When neither is set, Medusa does not start, and the error names the text.

### The project's namespace

Your project's `src/admin/i18n/index.ts` holds your namespace next to your own `translation`, with one tree per language:

```ts
// src/admin/i18n/index.ts
import en from "./json/en.json"
import contentEn from "./json/content.en.json"
import contentPl from "./json/content.pl.json"

export default {
  en: { translation: en, content: contentEn },
  pl: { content: contentPl },
}
```

> [!WARNING]
> `admin.translationNs` cannot be `translation`, `medusa-plugin-cms`, or `manager-form-fields`. Medusa merges the resources of every extension into one tree. A key that your project writes in one of these namespaces would replace the dashboard's or the plugin's own key.

### Keys

- A key names a leaf. If you also have `page.singular`, the key `page` reads an object, and i18next reports that instead of a text.
- A key holds no `:`. i18next reads `page:title` as the key `title` in a namespace named `page`. A `.` nests keys, as in `page.singular`.
- When a translated text stops Medusa from starting, the error quotes the key of that text.
- The [options from a hook](./fields.md#options-from-a-hook) (`defineCmsOptionsHook`) are for the hook to translate.

When a key is missing in the language of the Admin, the Admin falls back, in order, to:

1. English
2. Medusa's `translation` namespace
3. The key itself, shown as it is, so that the gap is visible

## The plugin's own texts

The buttons, statuses, messages, and form inputs of the plugin come in English and Polish, in two namespaces:

| Namespace | Holds | Keys listed in |
|---|---|---|
| `medusa-plugin-cms` | The **Content** screens | `src/admin/i18n/json/en.json` |
| `manager-form-fields` | The form inputs, including media | `src/admin/components/manager-form-fields/i18n/json/en.json` |

### Adding a language or replacing a text

To add a language or replace a text, write the same namespace in your project's `src/admin/i18n/index.ts`. The dashboard merges your namespace over the plugin's:

```ts
// src/admin/i18n/index.ts
export default {
  en: { "medusa-plugin-cms": { documents: { status: { published: "Live" } } } },
  de: { "medusa-plugin-cms": { documents: { status: { draft: "Entwurf" } } } },
}
```

When a language lacks a key, the Admin falls back to English.
