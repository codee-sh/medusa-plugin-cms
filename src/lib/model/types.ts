import type { DmlModel } from "../config/types"

export type ModelColumn = {
  name: string
  dataType: string
  nullable: boolean
  hasDefault: boolean
  searchable: boolean
  /** Whether a unique index covers this column alone, from `.unique()` or the model's `indexes`. */
  unique: boolean
  choices?: string[]
}

/** The kinds of DML relation, as `parse()` names them. */
export type RelationType =
  "hasOne" | "hasOneWithFK" | "hasMany" | "belongsTo" | "manyToMany"

export type ModelRelation = {
  /** The relation's property, e.g. `areas`. */
  name: string
  type: RelationType
  /** The DML name of the model it points at, in PascalCase. */
  target: string
  /** The model it points at. */
  model: DmlModel
  nullable: boolean
  /** A `belongsTo`'s column holding the target's id, e.g. `recipe_id`; no other relation has one. */
  foreignKey?: string
}

export type ModelDescription = {
  /** The DML name in PascalCase, e.g. `ContentPage`. */
  name: string
  tableName: string
  /** The prefix of the model's ids, `undefined` when `model.id()` sets none. */
  idPrefix?: string
  columns: ModelColumn[]
  /**
   * Each `belongsTo`'s foreign key as a text column, nullable as its relation, which Medusa adds to the
   * table and the DML schema does not list.
   */
  foreignKeyColumns: ModelColumn[]
  relations: ModelRelation[]
  /** The relations a soft delete of the model cascades to. */
  cascades: string[]
  /** The expressions of the model's `CHECK` constraints, as written. */
  checks: string[]
}
