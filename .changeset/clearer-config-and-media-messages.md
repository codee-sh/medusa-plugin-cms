---
"@mostrajs/cms": patch
---

Clearer error messages, and documentation that is easier to read.

- **Messages.** These messages now say what is wrong in plainer words. If your code or tests match one of them, update the text:
  - `The media provider "<identifier>" does not support search`, when the Admin searches a provider without `list`
  - `media "<field>" stores "url", but the media provider "<identifier>" stores only "id"`, at startup
  - `admin "edit" needs "page" or "drawer"`, at startup
  - `admin "edit" "drawer" takes no "drafts: true", as a drawer shows no status and cannot publish`, at startup
  - `a singleton takes no "drafts: true", as its page shows no status, publish actions, or version history`, at startup
  - `field "<name>" is filterable, but only a boolean field can be filterable`, at startup
  - `Options unavailable: no hook named "<name>" is registered`, in the Admin, in English and Polish
- **Documentation.** Every page is laid out for scanning, with options in tables, data shapes and responses in code blocks, and failures in lists, and it is written in plainer English. It now also covers the save checks of blocks, the startup checks of tables, singletons and store lists, the media routes' errors, and when `serverPublishValidation` runs.
