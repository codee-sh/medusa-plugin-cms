import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261116132505 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "test_section" drop constraint if exists "test_section_parent_id_name_unique";`
    )
    this.addSql(
      `alter table if exists "test_tip" drop constraint if exists "test_tip_step_id_foreign";`
    )

    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_test_section_parent_id_name_unique" ON "test_section" ("parent_id", "name") WHERE parent_id IS NOT NULL AND deleted_at IS NULL;`
    )

    this.addSql(`drop index if exists "IDX_test_tip_step_id";`)

    this.addSql(
      `alter table if exists "test_tip" rename column "step_id" to "area_id";`
    )
    this.addSql(
      `alter table if exists "test_tip" add constraint "test_tip_area_id_foreign" foreign key ("area_id") references "test_section" ("id") on update cascade on delete cascade;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_tip_area_id" ON "test_tip" ("area_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_tip_area_id_rank" ON "test_tip" ("area_id", "rank") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `drop index if exists "IDX_test_section_recipe_id_name_unique";`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_test_section_recipe_id_name_unique" ON "test_section" ("recipe_id", "name") WHERE recipe_id IS NOT NULL AND parent_id IS NULL AND deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "test_tip" drop constraint if exists "test_tip_area_id_foreign";`
    )

    this.addSql(
      `drop index if exists "IDX_test_section_parent_id_name_unique";`
    )

    this.addSql(`drop index if exists "IDX_test_tip_area_id";`)
    this.addSql(`drop index if exists "IDX_test_tip_area_id_rank";`)

    this.addSql(
      `alter table if exists "test_tip" rename column "area_id" to "step_id";`
    )
    this.addSql(
      `alter table if exists "test_tip" add constraint "test_tip_step_id_foreign" foreign key ("step_id") references "test_step" ("id") on update cascade on delete cascade;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_tip_step_id" ON "test_tip" ("step_id") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `drop index if exists "IDX_test_section_recipe_id_name_unique";`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_test_section_recipe_id_name_unique" ON "test_section" ("recipe_id", "name") WHERE recipe_id IS NOT NULL AND deleted_at IS NULL;`
    )
  }
}
