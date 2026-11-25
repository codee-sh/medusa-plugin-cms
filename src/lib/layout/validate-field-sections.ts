import { buildConfigError } from "../config/build-config-error"
import { describeText } from "../config/describe-text"
import type {
  ClientText,
  LayoutItemConfig,
  LayoutSectionConfig,
  LayoutTabConfig,
} from "../config/types"
import type { RegistryField } from "../field/types"
import { validateComponentField } from "./validate-component-field"
import { validateComponentNode } from "./validate-component-node"

/** What lays fields out: a section, a tab of its tabs, or a node in one. */
type LayoutContainer =
  "section" | "tab" | Exclude<LayoutItemConfig<ClientText>, string>["type"]

/**
 * The node types each container takes. Nesting goes one way, tabs to collapsible to group to row; tabs
 * hold tabs rather than items, and a row and a component take field names only. A component stands
 * where a field does, a row and another component aside.
 */
const CONTAINER_CHILDREN: Record<LayoutContainer, LayoutContainer[]> = {
  section: ["group", "row", "collapsible", "tabs", "component"],
  tab: ["group", "row", "collapsible", "component"],
  collapsible: ["group", "row", "component"],
  group: ["row", "component"],
  row: [],
  component: [],
  tabs: [],
}

/**
 * Walks a section's tree, checking that each node sits in a container that takes it and is not empty,
 * and hands every field name on.
 *
 * @param items - What a container lays out.
 * @param container - The container's type.
 * @param where - The config path and the section, which open each error message.
 * @param onName - Called with each field name, in the order shown, and whether a component node owns it.
 * @throws At the first node that does not fit.
 */
const validateLayoutItems = (
  items: LayoutItemConfig<ClientText>[],
  container: LayoutContainer,
  where: string,
  onName: (name: string, inComponent: boolean) => void
): void => {
  for (const item of items) {
    if (typeof item === "string") {
      onName(item, false)
      continue
    }

    if (!CONTAINER_CHILDREN[container].includes(item.type)) {
      const node = item.type === "tabs" ? "tabs" : `a ${item.type}`

      throw buildConfigError(`${where}: ${node} cannot sit in a ${container}`)
    }

    if (item.type === "tabs") {
      // A JS config can leave `tabs` or a tab's `fields` out, which the types do not allow.
      const tabs: LayoutTabConfig<ClientText>[] = item.tabs ?? []

      if (tabs.length < 2) {
        throw buildConfigError(`${where}: tabs need at least two tabs`)
      }

      for (const tab of tabs) {
        const tabFields: LayoutItemConfig<ClientText>[] = tab.fields ?? []

        if (!tabFields.length) {
          throw buildConfigError(
            `${where}: a tab "${describeText(tab.label)}" lists no fields`
          )
        }

        validateLayoutItems(tabFields, "tab", where, onName)
      }

      continue
    }

    if (item.type === "component") {
      for (const name of validateComponentNode(item, where)) {
        onName(name, true)
      }

      continue
    }

    // A JS config can leave `fields` out, which the types do not allow.
    const fields: LayoutItemConfig<ClientText>[] = item.fields ?? []

    if (item.type === "row" && fields.length < 2) {
      throw buildConfigError(`${where}: a row needs at least two fields`)
    }

    if (item.type !== "row" && !fields.length) {
      throw buildConfigError(
        `${where}: a ${item.type} "${describeText(item.label)}" lists no fields`
      )
    }

    validateLayoutItems(fields, item.type, where, onName)
  }
}

/** The names of the fields and the areas that must each sit in a section. */
export type RequiredSectionNames = {
  fields: string[]
  areas: string[]
}

/**
 * Checks that each form section names editable fields and areas of what it lays out, each in one
 * section at most, that the nodes of its tree sit where they may, that a component node owns
 * neither a slug, a media or a `richtext` field nor a unique field, and that every name `required`
 * lists sits in a section.
 *
 * @param fields - The fields of the collection or block.
 * @param areas - The names of its areas.
 * @param unique - The fields a unique index covers alone, which the Admin checks as the editor types.
 * @param sections - Its `admin.sections`, their texts prepared.
 * @param required - The fields and areas no section may leave out.
 * @param path - Where the config sits, for error messages.
 * @throws At the first section that does not fit, or naming every required field and area left out.
 */
export const validateFieldSections = (
  fields: RegistryField[],
  areas: string[],
  unique: string[],
  sections: Pick<
    LayoutSectionConfig<ClientText>,
    "label" | "fields" | "areas"
  >[],
  required: RequiredSectionNames,
  path: string
): void => {
  const sectionedFields = new Set<string>()
  const sectionedAreas = new Set<string>()

  sections.forEach((section, index) => {
    const where =
      section.label === undefined
        ? `${path}: admin section [${index}]`
        : `${path}: admin section "${describeText(section.label)}"`

    if (!section.fields.length && !section.areas?.length) {
      throw buildConfigError(`${where} lists no fields or areas`)
    }

    validateLayoutItems(
      section.fields,
      "section",
      where,
      (name, inComponent) => {
        const field = fields.find((candidate) => candidate.name === name)

        if (!field) {
          throw buildConfigError(
            `${where} names "${name}", which is not an editable field`
          )
        }

        if (inComponent) {
          validateComponentField(field, unique, where)
        }

        if (sectionedFields.has(name)) {
          throw buildConfigError(
            `${path}: "${name}" is in more than one admin section`
          )
        }

        sectionedFields.add(name)
      }
    )

    for (const name of section.areas ?? []) {
      if (!areas.includes(name)) {
        throw buildConfigError(`${where} names "${name}", which is not an area`)
      }

      if (sectionedAreas.has(name)) {
        throw buildConfigError(
          `${path}: area "${name}" is in more than one admin section`
        )
      }

      sectionedAreas.add(name)
    }
  })

  const missing = [
    ...required.fields
      .filter((name) => !sectionedFields.has(name))
      .map((name) => `"${name}"`),
    ...required.areas
      .filter((name) => !sectionedAreas.has(name))
      .map((name) => `area "${name}"`),
  ]

  if (missing.length) {
    throw buildConfigError(
      `${path}: ${missing.join(", ")} sit in no admin section; place each in one`
    )
  }
}
