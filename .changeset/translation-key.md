---
"@mostrajs/cms": patch
---

`translationKey(key, options?)` names a translation as a text of the config, in place of a `({ t }) => t(key)` function of your own.

**Features**
- `translationKey` is exported from `@mostrajs/cms` and takes the options of `t`, `ns` included: `label: translationKey("page.singular")`.
- The README's basic setup says that a label written as a string shows the same in every language, and links to the page on translations.
