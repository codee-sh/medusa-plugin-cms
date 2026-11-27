---
"@mostrajs/cms": patch
---

The Admin's forms, tabs and rich text editor look as intended in a project that installs the plugin from npm.

**Fixes**
- A form with tabs shows only the open tab's fields, where it showed every tab's fields at once.
- The rich text editor keeps its height when empty, its redo button shows a mirrored arrow, and a quote shows its left border.
- A link in the rich text editor takes Medusa's interactive colour on hover, in place of an underline the Admin never drew.
- A block's sections are divided by a line, with none above the first.
