import type { RelationshipMetadata } from "@medusajs/framework/types"
import { getForeignKey } from "@medusajs/framework/utils"
import type { DmlModel } from "../config/types"
import type {
  ModelColumn,
  ModelDescription,
  ModelRelation,
  RelationType,
} from "./types"

type ParsedProperty = {
  fieldName: string
  dataType: { name: string; options?: Record<string, unknown> }
  nullable: boolean
  defaultValue?: unknown
  indexes?: { type: string }[]
}

/** A relation as its `parse` answers it: Medusa's metadata, the model it points at returned by `entity`. */
type ParsedRelation = RelationshipMetadata & {
  type: RelationType
  nullable: boolean
  entity: () => DmlModel
}

/**
 * Tells a parsed relation from a parsed column.
 *
 * @param parsed - The result of a property's `parse`.
 * @returns Whether it is a relation.
 */
const isParsedRelation = (
  parsed: ParsedProperty | ParsedRelation
): parsed is ParsedRelation => "entity" in parsed

/**
 * Describes a DML model in the terms the registry works with.
 *
 * @param entity - The DML model.
 * @returns Its names, id prefix, columns, relations, cascades and checks; the id and relations are
 * left out of the columns, and a `belongsTo`'s foreign key, which Medusa names as it builds the entity,
 * is a column of `foreignKeyColumns` instead; a check written as a function is left out of the checks.
 */
export const describeModel = (entity: DmlModel): ModelDescription => {
  const { name, tableName, schema, indexes, cascades, checks } = entity.parse()
  const uniqueByIndex = (indexes ?? [])
    .filter((index) => index.unique && index.on.length === 1)
    .map((index) => String(index.on[0]))
  const columns: ModelColumn[] = []
  const foreignKeyColumns: ModelColumn[] = []
  const relations: ModelRelation[] = []
  let idPrefix: string | undefined

  for (const [key, property] of Object.entries(schema)) {
    const parsed = (
      property as { parse: (name: string) => ParsedProperty | ParsedRelation }
    ).parse(key)

    if (isParsedRelation(parsed)) {
      const target = parsed.entity()
      const foreignKey =
        parsed.type === "belongsTo" ? getForeignKey(parsed) : undefined

      relations.push({
        name: key,
        type: parsed.type,
        target: target.parse().name,
        model: target,
        nullable: parsed.nullable,
        ...(foreignKey && { foreignKey }),
      })

      if (foreignKey) {
        foreignKeyColumns.push({
          name: foreignKey,
          dataType: "text",
          nullable: parsed.nullable,
          hasDefault: false,
          searchable: false,
          unique: uniqueByIndex.includes(foreignKey),
        })
      }
      continue
    }

    if (parsed.dataType.name === "id") {
      idPrefix = parsed.dataType.options?.prefix as string | undefined
      continue
    }

    columns.push({
      name: key,
      dataType: parsed.dataType.name,
      nullable: parsed.nullable,
      hasDefault: parsed.defaultValue !== undefined,
      searchable: parsed.dataType.options?.searchable === true,
      unique:
        uniqueByIndex.includes(key) ||
        (parsed.indexes ?? []).some((index) => index.type === "unique"),
      choices: parsed.dataType.options?.choices as string[] | undefined,
    })
  }

  return {
    name,
    tableName,
    idPrefix,
    columns,
    foreignKeyColumns,
    relations,
    cascades: cascades.delete ?? [],
    checks: (checks ?? []).flatMap((check) =>
      typeof check !== "function" && typeof check.expression === "string"
        ? [check.expression]
        : []
    ),
  }
}
