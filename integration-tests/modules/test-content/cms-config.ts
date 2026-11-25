import { z } from "@medusajs/framework/zod"
import type { Config } from "../../../src/lib/config/types"
import { FileMediaProvider } from "../../../src/lib/media-provider/file-media-provider"
import { TEST_CONTENT_MODULE } from "./index"
import {
  TestCallout,
  TestRecipe,
  TestSettings,
  TestSettingsLink,
  TestStep,
  TestTag,
  TestTip,
} from "./models"

/**
 * Builds a valid config over the test models, for the unit tests and the test app alike.
 *
 * @returns A config a test can break.
 */
export const buildTestConfig = (): Config => ({
  module: TEST_CONTENT_MODULE,
  admin: {
    // Two of the recipe's labels are translations, one in this namespace and one in Medusa's own.
    translationNs: "cms-test",
    // The settings' page shows the settings and their links, a route of two collections. A function
    // of the default, so a collection a test adds is a route of its own.
    routes: ({ defaultRoutes }) =>
      defaultRoutes
        .filter(({ collections }) => !collections.includes("settings_link"))
        .map((route) =>
          route.slug === "settings"
            ? {
                ...route,
                label: "Settings",
                collections: ["settings", "settings_link"],
              }
            : route
        ),
  },
  collections: [
    {
      slug: "recipe",
      model: TestRecipe,
      // Drafts and versions on, which a collection opts into.
      drafts: true,
      labels: { singular: "Recipe", plural: "Recipes" },
      admin: {
        useAsTitle: "title",
        table: {
          columns: [
            { field: "title" },
            { system: "status" },
            { system: "updated_at" },
          ],
        },
        // Every field and area in a section: the media beside the rest, the blocks in a card of their own.
        sections: [
          {
            key: "recipe",
            label: "Recipe",
            fields: [
              "title",
              "slug",
              "servings",
              "vegan",
              "cooked_at",
              "difficulty",
              "labels",
              "notes",
              "summary",
              "related_recipe_id",
            ],
          },
          {
            key: "media",
            label: "Media",
            fields: ["cover", "gallery"],
            position: "side",
          },
          { key: "content", label: "Content", fields: [], areas: ["sections"] },
        ],
      },
      // A low relations limit, as a project may set one, so a deep block path is refused.
      store: { retrieve: { storeRelationsLimit: 4 } },
      fields: {
        title: {
          type: "text",
          label: "Title",
          serverValidation: z
            .string()
            .min(3, "Use at least 3 characters")
            .nullish(),
          serverPublishValidation: z.string(),
        },
        slug: { type: "slug", label: "Slug", from: "title" },
        servings: {
          type: "number",
          label: ({ t }) => t("recipe.servings"),
        },
        vegan: {
          type: "boolean",
          label: "Vegan",
          store: { filterable: true },
        },
        cooked_at: {
          type: "date",
          label: ({ t }) =>
            t("fields.cookedAt", { ns: "translation", context: "short" }),
        },
        difficulty: {
          type: "select",
          label: "Difficulty",
          options: [
            { value: "easy", label: "Easy" },
            { value: "hard", label: "Hard" },
          ],
        },
        labels: { type: "text_list", label: "Labels" },
        cover: { type: "media", label: "Cover", stores: "id" },
        gallery: {
          type: "media",
          label: "Gallery",
          stores: "id",
          multiple: true,
          max: 3,
          admin: { mimeTypes: ["image/png", "application/pdf"] },
        },
        notes: {
          type: "textarea",
          label: "Notes",
          serverValidation: z.string(),
          store: { hidden: true },
        },
        summary: { type: "richtext", label: "Summary" },
        related_recipe_id: {
          type: "relationship",
          relationTo: "recipe",
          label: "Related recipe",
        },
      },
      areas: {
        sections: { label: "Sections", blocks: ["step", "callout"] },
      },
    },
    {
      // A dictionary without drafts: live from its creation, each save live at once.
      slug: "tag",
      model: TestTag,
      labels: { singular: "Tag", plural: "Tags" },
      admin: {
        useAsTitle: "name",
        sections: [
          { key: "tag", label: "Tag", fields: ["name", "slug", "description"] },
        ],
      },
      fields: {
        name: { type: "text", label: "Name", serverValidation: z.string() },
        slug: { type: "slug", label: "Slug", from: "name" },
        // A rule a publish needs, so a create without drafts shows it is checked.
        description: {
          type: "text",
          label: "Description",
          serverPublishValidation: z.string(),
        },
      },
    },
    {
      // Settings held in one document, saved live.
      slug: "settings",
      model: TestSettings,
      singleton: true,
      labels: { singular: "Settings", plural: "Settings" },
      admin: {
        sections: [
          {
            key: "main",
            label: "Settings",
            fields: ["title", "featured_note", "featured_recipe_id"],
          },
        ],
      },
      fields: {
        title: { type: "text", label: "Title" },
        featured_note: { type: "textarea", label: "Featured note" },
        featured_recipe_id: {
          type: "relationship",
          relationTo: "recipe",
          label: "Featured recipe",
        },
      },
    },
    {
      // Rows on the settings' route beside the singleton, without drafts, edited in a drawer.
      slug: "settings_link",
      model: TestSettingsLink,
      labels: { singular: "Link", plural: "Links" },
      admin: {
        useAsTitle: "label",
        edit: "drawer",
        table: {
          columns: [
            { field: "label" },
            { field: "url" },
            { system: "updated_at" },
          ],
          defaultSort: { column: "label", direction: "asc" },
        },
        sections: [{ key: "link", label: "Link", fields: ["label", "url"] }],
      },
      fields: {
        label: { type: "text", label: "Label" },
        url: { type: "url", label: "URL" },
      },
    },
  ],
  blocks: [
    {
      slug: "step",
      model: TestStep,
      labels: { singular: "Step", plural: "Steps" },
      fields: {
        heading: {
          type: "text",
          label: "Heading",
          serverPublishValidation: z.string(),
        },
      },
      areas: {
        tips: { label: "Tips", blocks: ["tip", "step"] },
      },
    },
    {
      slug: "callout",
      model: TestCallout,
      labels: { singular: "Callout", plural: "Callouts" },
      fields: {
        body: { type: "richtext", label: "Body" },
        image: { type: "media", label: "Image", stores: "id" },
      },
    },
    {
      slug: "tip",
      model: TestTip,
      labels: { singular: "Tip", plural: "Tips" },
      fields: {
        text: {
          type: "text",
          label: "Text",
          serverPublishValidation: z.string(),
        },
      },
    },
  ],
  media: { provider: { resolve: FileMediaProvider } },
})
