---
{"title": "A model key in MedusaService must match its DML name", "modules": [], "areas": ["backend"], "topics": ["dml", "orm"]}
---

# A model key in MedusaService must match its DML name

`MedusaService({ Page })` with `model.define("content_page", ...)` compiles, and fails on the first
call. Medusa derives one service name from the key and another from the model:

- a generated method looks up `<lowerCaseFirst(key)>Service`, here `pageService`
  (`@medusajs/utils` 2.22.7 `dist/modules-sdk/medusa-service.js:91`);
- the module container registers `<lowerCaseFirst(Model.name)>Service`, here `contentPageService`
  (`dist/modules-sdk/loaders/container-loader-factory.js:50`);
- `query.graph` calls `list<pluralize(Model.name)>`, here `listContentPages`, while the service only
  generated `listPages` (`dist/modules-sdk/joiner-config-builder.js:209`).

`Model.name` is the PascalCase of the DML name, so `content_page` is `ContentPage`. Nothing checks this
at definition time, and it stays hidden because modules usually name the constant after the model:
`BlogPost` with `model.define("blog_post")`.

Name the key the PascalCase of the DML name. To keep a short key, set the name and the table apart with
`model.define({ name: "Page", tableName: "content_page" })`, knowing the joiner alias becomes `page`.
