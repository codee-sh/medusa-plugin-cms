# Translations

Translating your config's texts, and overriding the plugin's own.

## Translating the config's texts

Each text a config gives the Admin takes one of two forms:

- **A string** - shown as written in every language.
- **A function given `{ t }`** - run once at start. Its `t(key, options?)` names a translation the Admin shows in the editor's language.

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

These texts each take either form:

- collection and block labels
- field labels and descriptions
- option labels
- section, tab, group, collapsible, component and area labels
- a `link` action's label

### `t(key, options?)`

`t` names a translation the Admin shows in the editor's language. The function given `{ t }` may also return a string, to keep that text plain.

```ts
// exported from @mostrajs/cms
type CmsText = string | ((params: { t: CmsTranslate }) => string | TranslatedText)

type CmsTranslate = (
  key: string,
  options?: TranslationOptions & { ns?: string }
) => TranslatedText

type TranslationOptions = Record<string, string | number | boolean>
```

`t`'s options are i18next's:

| Option | Type | Default | Description |
|---|---|---|---|
| `ns` | `string` | `admin.translationNs` | The namespace, any one, Medusa's `translation` included, as a text only reads it. |
| `context`, `count`, a value the text interpolates | `string`, `number` or `boolean` | - | i18next's own options. |

Without `options.ns`, `t` takes `admin.translationNs`. Without both, the start stops, naming the text.

### The project's namespace

The project's `src/admin/i18n/index.ts` holds its namespace next to its own `translation`, one tree per language:

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
> `admin.translationNs` cannot be `translation`, `medusa-plugin-cms` or `manager-form-fields`. Medusa merges every extension's resources into one tree, so a project's key there would replace the dashboard's or the plugin's own.

### Keys

- A key is a leaf: `page` beside `page.singular` reads an object, which i18next reports instead of a text.
- A key holds no `:`: i18next reads `page:title` as the key `title` of a namespace `page`. A `.` nests, as above.
- A startup error about a translated text quotes its key.
- Options from a hook (`defineCmsOptionsHook`) are the hook's to translate.

A key missing in the Admin's language falls back, in order, to:

1. English.
2. Medusa's `translation` namespace.
3. The key, shown as it is - so a gap is visible.

## The plugin's own texts

The plugin's buttons, statuses, messages and form inputs come in English and Polish, in two namespaces:

| Namespace | Holds | Keys listed in |
|---|---|---|
| `medusa-plugin-cms` | The Content screens | `src/admin/i18n/json/en.json` |
| `manager-form-fields` | The form inputs, media included | `src/admin/components/manager-form-fields/i18n/json/en.json` |

### Adding a language or replacing a text

A project adds a language, or replaces a text, by writing the same namespace in its own `src/admin/i18n/index.ts`. The dashboard merges it over the plugin's:

```ts
// src/admin/i18n/index.ts
export default {
  en: { "medusa-plugin-cms": { documents: { status: { published: "Live" } } } },
  de: { "medusa-plugin-cms": { documents: { status: { draft: "Entwurf" } } } },
}
```

A key a language lacks falls back to English.
