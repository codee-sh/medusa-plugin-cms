import { buildTestConfig } from "../../__tests__/fixtures"
import type { CmsRoute, Config, LayoutSectionConfig } from "../../config/types"
import { prepareRegistry } from "../prepare-registry"
import type { RegistryRoute } from "../types"

/** The test config's settings section, holding every field of the singleton. */
const SETTINGS_MAIN: LayoutSectionConfig = {
  key: "main",
  label: "Settings",
  fields: ["title", "featured_note", "featured_recipe_id"],
}

/** The links' table, resolved: the collection's own `admin.table`. */
const LINKS_TABLE = {
  columns: [{ field: "label" }, { field: "url" }, { system: "updated_at" }],
  defaultSort: { column: "label", direction: "asc" },
}

/**
 * Builds the test config with the given routes, or none.
 *
 * @param routes - The routes; the test config's own when left out, none when `null`.
 * @returns The config.
 */
const configWith = (
  routes?: NonNullable<Config["admin"]>["routes"] | null
): Config => {
  const config = buildTestConfig()

  if (routes === null) {
    delete config.admin!.routes
  } else if (routes !== undefined) {
    config.admin = { ...config.admin, routes }
  }

  return config
}

/**
 * Gives the test singleton sections.
 *
 * @param config - The config, changed in place.
 * @param sections - The singleton's sections.
 * @returns The config.
 */
const withSettingsSections = (
  config: Config,
  sections: LayoutSectionConfig[]
): Config => {
  const settings = config.collections.find(({ slug }) => slug === "settings")!
  settings.admin = { ...settings.admin, sections }

  return config
}

/**
 * Reduces a route to what a test compares: its slug, its label, its parent, its collections and its
 * children.
 *
 * @param route - The route.
 * @returns The route's parts, in that order.
 */
const summaryOf = (route: RegistryRoute) => [
  route.slug,
  route.label,
  route.parent,
  route.collections.map(({ collection }) => collection),
  route.children,
]

/**
 * Builds the registry and returns its error message.
 *
 * @param config - The config.
 * @returns The message, or an empty text when the build passed.
 */
const errorOf = (config: Config): string => {
  try {
    prepareRegistry(config)
    return ""
  } catch (error) {
    return (error as Error).message
  }
}

describe("prepareRoutes", () => {
  it("makes every collection a top-level route of its own slug without routes, named by its page label", () => {
    const registry = prepareRegistry(configWith(null))

    expect(registry.routes.map(summaryOf)).toEqual([
      ["recipe", "Recipes", undefined, ["recipe"], []],
      ["tag", "Tags", undefined, ["tag"], []],
      ["settings", "Settings", undefined, ["settings"], []],
      ["settings_link", "Links", undefined, ["settings_link"], []],
    ])
    expect(registry.collections.recipe.admin.route).toBe("recipe")
  })

  it("shows the settings and their links on one route, the links' table the collection's own", () => {
    const registry = prepareRegistry(configWith())

    expect(
      registry.routes.find(({ slug }) => slug === "settings")
    ).toMatchObject({
      label: "Settings",
      collections: [
        { collection: "settings", key: "settings" },
        {
          collection: "settings_link",
          key: "settings_link",
          position: "main",
          table: LINKS_TABLE,
        },
      ],
    })
    expect(registry.collections.settings_link.admin.route).toBe("settings")
  })

  it("places a list, a route of the settings and their links under it, and a list beside, in the tree's order", () => {
    const registry = prepareRegistry(
      configWith([
        {
          slug: "recipes",
          collections: ["recipe"],
          children: [
            {
              slug: "site_settings",
              label: "Site settings",
              collections: ["settings", "settings_link"],
            },
          ],
        },
        { slug: "tags", collections: ["tag"] },
      ])
    )

    expect(registry.routes.map(summaryOf)).toEqual([
      ["recipes", "Recipes", undefined, ["recipe"], ["site_settings"]],
      [
        "site_settings",
        "Site settings",
        "recipes",
        ["settings", "settings_link"],
        [],
      ],
      ["tags", "Tags", undefined, ["tag"], []],
    ])
    expect(registry.collections.recipe.admin.route).toBe("recipes")
    expect(registry.collections.settings_link.admin.route).toBe("site_settings")
  })

  it("resolves a route of several collections: its label, a list's heading, table and column, a singleton's key alone", () => {
    const registry = prepareRegistry(
      configWith([
        {
          slug: "kitchen",
          label: ({ t }) => t("kitchen.label"),
          description: "Recipes and settings",
          collections: [
            "settings",
            {
              collection: "recipe",
              key: "dishes",
              label: ({ t }) => t("kitchen.dishes"),
              description: "What we cook",
              position: "side",
              pageSize: 5,
            },
            "tag",
          ],
          children: [{ slug: "links", collections: ["settings_link"] }],
        },
      ])
    )

    expect(registry.routes[0]).toEqual({
      slug: "kitchen",
      label: { type: "translation", key: "kitchen.label", ns: "cms-test" },
      description: "Recipes and settings",
      collections: [
        { collection: "settings", key: "settings" },
        {
          collection: "recipe",
          key: "dishes",
          label: { type: "translation", key: "kitchen.dishes", ns: "cms-test" },
          description: "What we cook",
          position: "side",
          table: {
            ...registry.collections.recipe.admin.table,
            pageSize: 5,
          },
        },
        {
          collection: "tag",
          key: "tag",
          position: "main",
          table: registry.collections.tag.admin.table,
        },
      ],
      parent: undefined,
      children: ["links"],
    })
    expect(registry.collections.settings.admin.route).toBe("kitchen")
  })

  it("puts a list entry's settings over its collection's table, its column labels prepared", () => {
    const registry = prepareRegistry(
      configWith([
        { slug: "recipe", collections: ["recipe"] },
        { slug: "tag", collections: ["tag"] },
        {
          slug: "settings",
          label: "Settings",
          collections: [
            "settings",
            {
              collection: "settings_link",
              columns: [{ field: "label" }, { field: "url", label: "Address" }],
              pageSize: 10,
            },
          ],
        },
      ])
    )

    expect(registry.routes[2].collections[1].table).toEqual({
      columns: [{ field: "label" }, { field: "url", label: "Address" }],
      defaultSort: { column: "label", direction: "asc" },
      pageSize: 10,
    })
  })

  it("gives a list's table the route's children as buttons only when the route shows that list alone", () => {
    const registry = prepareRegistry(
      configWith([
        {
          slug: "recipes",
          collections: ["recipe"],
          children: [{ slug: "settings", collections: ["settings"] }],
        },
        {
          slug: "kitchen",
          label: "Kitchen",
          collections: ["tag", "settings_link"],
        },
      ])
    )

    expect(registry.collections.recipe.admin.actions).toEqual([
      { type: "route", route: "settings" },
      { type: "create" },
    ])
    expect(registry.collections.tag.admin.actions).toEqual([{ type: "create" }])
  })

  it("lists a singleton's route's children, which stand under its sections", () => {
    const registry = prepareRegistry(
      configWith([
        { slug: "recipe", collections: ["recipe"] },
        {
          slug: "settings",
          collections: ["settings"],
          children: [{ slug: "tag", collections: ["tag"] }],
        },
        { slug: "links", collections: ["settings_link"] },
      ])
    )

    expect(
      registry.routes.find(({ slug }) => slug === "settings")?.children
    ).toEqual(["tag"])
  })

  it("runs a routes function once, on a copy of the default", () => {
    const routes = jest.fn(
      ({ defaultRoutes }: { defaultRoutes: CmsRoute[] }) => {
        defaultRoutes[0].collections.push("tag")

        return [...defaultRoutes].reverse().map((route) => ({
          ...route,
          collections: route.collections.filter(
            (entry, index) => index === 0 || entry !== "tag"
          ),
        }))
      }
    )
    const registry = prepareRegistry(configWith(routes))

    expect(routes).toHaveBeenCalledTimes(1)
    expect(registry.routes.map(({ slug }) => slug)).toEqual([
      "settings_link",
      "settings",
      "tag",
      "recipe",
    ])
  })

  it("keeps a singleton's sections in their order, each in its column", () => {
    const config = withSettingsSections(configWith(), [
      { key: "note", label: "Note", fields: ["featured_note"] },
      {
        key: "title",
        label: "Title",
        fields: ["title", "featured_recipe_id"],
        position: "side",
      },
    ])

    expect(
      prepareRegistry(config).collections.settings.admin.sections.map(
        ({ key, position }) => [key, position]
      )
    ).toEqual([
      ["note", "main"],
      ["title", "side"],
    ])
  })

  it.each<[string, () => Config, string]>([
    [
      "a route list that is no list",
      () => configWith((() => "recipe") as unknown as () => CmsRoute[]),
      'admin "routes" must be a list of routes',
    ],
    [
      "a route without a slug",
      () => configWith([{ collections: ["recipe"] } as unknown as CmsRoute]),
      'admin "routes": a route needs a "slug" of text',
    ],
    [
      "a slug not snake_case",
      () => configWith([{ slug: "Recipes", collections: ["recipe"] }]),
      'admin "routes": route "Recipes": not snake_case, or repeated',
    ],
    [
      "a slug twice in the tree",
      () =>
        configWith([
          {
            slug: "recipes",
            collections: ["recipe"],
            children: [{ slug: "recipes", collections: ["tag"] }],
          },
        ]),
      'admin "routes" route "recipes" children: route "recipes": not snake_case, or repeated',
    ],
    [
      "a route naming no collection",
      () => configWith([{ slug: "nope", collections: ["nope"] }]),
      'admin "routes": route "nope" "collection" "nope" is not a collection',
    ],
    [
      "a collection on two routes",
      () =>
        configWith([
          { slug: "recipes", collections: ["recipe"] },
          { slug: "cooking", collections: ["recipe"] },
        ]),
      '"recipe" is on two routes; its documents have one address',
    ],
    [
      "a route without collections",
      () => configWith([{ slug: "recipe" } as CmsRoute]),
      'admin "routes": route "recipe" "collections" must be a list of one collection at least',
    ],
    [
      "a route of no collections",
      () => configWith([{ slug: "site", label: "Site", collections: [] }]),
      'route "site" "collections" must be a list of one collection at least',
    ],
    [
      "a route of several collections without a label",
      () =>
        configWith([
          { slug: "site", collections: ["recipe", "tag"] },
          { slug: "settings", collections: ["settings", "settings_link"] },
        ]),
      'admin "routes" route "site" needs a "label", as it shows several collections',
    ],
    [
      "a collection twice on one route",
      () =>
        configWith([
          { slug: "site", label: "Site", collections: ["recipe", "recipe"] },
        ]),
      '"recipe" is on two routes; its documents have one address',
    ],
    [
      "a singleton's entry with a list's key",
      () =>
        configWith([
          { slug: "recipe", collections: ["recipe"] },
          {
            slug: "site",
            label: "Site",
            collections: [
              { collection: "settings", label: "Settings", pageSize: 5 },
              "tag",
              "settings_link",
            ],
          },
        ]),
      'route "site" collection "settings" is a singleton, whose sections keep their own columns and headings and which has no table: leave label, pageSize out',
    ],
    [
      "a list's entry in an unknown column",
      () =>
        configWith([
          {
            slug: "site",
            label: "Site",
            collections: [
              { collection: "recipe", position: "top" as "main" },
              "tag",
              "settings",
              "settings_link",
            ],
          },
        ]),
      'route "site" collection "recipe" "position" must be main or side',
    ],
    [
      "a list's entry whose table names no field",
      () =>
        configWith([
          {
            slug: "site",
            label: "Site",
            collections: [
              { collection: "recipe", columns: [{ field: "nope" }] },
              "tag",
              "settings",
              "settings_link",
            ],
          },
        ]),
      'route "site" collection "recipe": table column [0] "field" "nope" is not a field',
    ],
    [
      "a list's entry whose columns leave out the collection's first order",
      () =>
        configWith([
          { slug: "recipe", collections: ["recipe"] },
          { slug: "tag", collections: ["tag"] },
          {
            slug: "settings",
            label: "Settings",
            collections: [
              "settings",
              { collection: "settings_link", columns: [{ field: "url" }] },
            ],
          },
        ]),
      'collection "settings_link": table defaultSort "label" is no sortable column of the table',
    ],
    [
      "a key two collections of a page share",
      () =>
        configWith([
          {
            slug: "site",
            label: "Site",
            collections: [
              { collection: "recipe", key: "tag" },
              "tag",
              "settings",
              "settings_link",
            ],
          },
        ]),
      'route "site" collection "tag" takes the key "tag", which another collection of the page has',
    ],
    [
      "a collection on no route",
      () =>
        configWith([
          { slug: "recipe", collections: ["recipe"] },
          { slug: "settings", collections: ["settings"] },
          { slug: "links", collections: ["settings_link"] },
        ]),
      'admin "routes": "tag" stands on no route, so the Admin cannot reach it',
    ],
    [
      "a section naming another collection, as table sections did",
      () =>
        withSettingsSections(configWith(), [
          SETTINGS_MAIN,
          {
            type: "table",
            collection: "settings_link",
            label: "Links",
          } as unknown as LayoutSectionConfig,
        ]),
      'collection "settings": admin section [1] lays out its own fields alone: show another collection\'s table on a route',
    ],
  ])("refuses %s", (_name, build, message) => {
    expect(errorOf(build())).toContain(message)
  })

  it.each<[string, LayoutSectionConfig[], string]>([
    [
      "missing",
      [
        {
          label: "Settings",
          fields: ["title", "featured_note", "featured_recipe_id"],
        } as LayoutSectionConfig,
      ],
      'admin section [0] needs a "key" of text',
    ],
    [
      "one key twice",
      [
        { key: "main", label: "Title", fields: ["title"] },
        {
          key: "main",
          label: "Note",
          fields: ["featured_note", "featured_recipe_id"],
        },
      ],
      'admin section key "main" is taken by another section',
    ],
  ])("refuses a section key that is %s", (_name, sections, message) => {
    expect(errorOf(withSettingsSections(configWith(), sections))).toContain(
      message
    )
  })
})
