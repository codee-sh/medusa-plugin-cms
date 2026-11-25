import { model } from "@medusajs/framework/utils"
import { describeModel } from "../describe-model"
import { TestRecipe, TestSection, TestStep } from "../../__tests__/fixtures"

describe("describeModel", () => {
  it("names the model and its table", () => {
    const description = describeModel(TestRecipe)

    expect(description.name).toBe("TestRecipe")
    expect(description.tableName).toBe("test_recipe")
  })

  it("describes a column's type, nullability, default and search", () => {
    const { columns } = describeModel(TestRecipe)
    const column = (name: string) =>
      columns.find((candidate) => candidate.name === name)

    expect(column("title")).toMatchObject({
      dataType: "text",
      nullable: true,
      searchable: true,
    })
    expect(column("vegan")).toMatchObject({
      dataType: "boolean",
      hasDefault: true,
    })
    expect(column("difficulty")?.choices).toEqual(["easy", "hard"])
    expect(column("notes")).toMatchObject({
      nullable: false,
      hasDefault: false,
    })
  })

  it("reads the id prefix", () => {
    expect(describeModel(TestRecipe).idPrefix).toBe("trec")
  })

  it("marks a column unique through the model's indexes or .unique()", () => {
    const Coded = model
      .define("test_coded", {
        id: model.id({ prefix: "tcod" }).primaryKey(),
        code: model.text().unique(),
        pair_a: model.text(),
        pair_b: model.text(),
      })
      .indexes([{ on: ["pair_a", "pair_b"], unique: true }])
    const unique = (name: string) =>
      describeModel(Coded).columns.find((candidate) => candidate.name === name)
        ?.unique

    expect(
      describeModel(TestRecipe).columns.find(({ name }) => name === "slug")
        ?.unique
    ).toBe(true)
    expect(unique("code")).toBe(true)
    expect(unique("pair_a")).toBe(false)
  })

  it("leaves relations out of the columns, a belongsTo's foreign key among them", () => {
    const names = describeModel(TestSection).columns.map(({ name }) => name)

    expect(names).not.toContain("recipe")
    expect(names).not.toContain("recipe_id")
  })

  it("names a belongsTo's foreign key as Medusa does", () => {
    const Target = model.define("test_target", {
      id: model.id({ prefix: "ttgt" }).primaryKey(),
      featured_in: model.hasMany(() => Referrer, {
        mappedBy: "featuredTarget",
      }),
      linked_in: model.hasMany(() => Referrer, { mappedBy: "linked" }),
    })
    const Referrer = model.define("test_referrer", {
      id: model.id({ prefix: "tref" }).primaryKey(),
      featuredTarget: model
        .belongsTo(() => Target, { mappedBy: "featured_in" })
        .nullable(),
      linked: model
        .belongsTo(() => Target, {
          mappedBy: "linked_in",
          foreignKeyName: "link_target_id",
        })
        .nullable(),
    })
    const foreignKey = (relation: string) =>
      describeModel(Referrer).relations.find(({ name }) => name === relation)
        ?.foreignKey

    expect(foreignKey("featuredTarget")).toBe("featured_target_id")
    expect(foreignKey("linked")).toBe("link_target_id")
    expect(
      describeModel(Target).relations.map(({ foreignKey: key }) => key)
    ).toEqual([undefined, undefined])
  })

  it("describes relations with their type, target, model and nullability", () => {
    const { relations } = describeModel(TestSection)

    expect(relations).toEqual(
      expect.arrayContaining([
        {
          name: "recipe",
          type: "belongsTo",
          target: "TestRecipe",
          model: TestRecipe,
          nullable: true,
          foreignKey: "recipe_id",
        },
        {
          name: "steps",
          type: "hasMany",
          target: "TestStep",
          model: TestStep,
          nullable: false,
        },
      ])
    )
  })

  it("reads the relations a delete cascades to, and the check expressions", () => {
    const { cascades, checks } = describeModel(TestSection)

    expect(cascades).toEqual(["steps", "callouts", "tips"])
    expect(checks).toEqual(["num_nonnulls(recipe_id) = 1"])
  })

  it("leaves a check written as a function out of the checks", () => {
    const Checked = model
      .define("test_checked", { id: model.id({ prefix: "tchk" }).primaryKey() })
      .checks([{ name: "CHK_fn", expression: () => "true" }])

    expect(describeModel(Checked).checks).toEqual([])
  })
})
