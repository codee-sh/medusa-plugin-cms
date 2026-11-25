import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261110111150 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "test_callout" drop constraint if exists "test_callout_section_id_foreign";`
    )

    this.addSql(
      `alter table if exists "test_step" drop constraint if exists "test_step_section_id_foreign";`
    )

    this.addSql(`drop index if exists "IDX_test_callout_section_id";`)
    this.addSql(`drop index if exists "IDX_test_callout_section_id_rank";`)

    this.addSql(
      `alter table if exists "test_callout" rename column "section_id" to "area_id";`
    )
    this.addSql(
      `alter table if exists "test_callout" add constraint "test_callout_area_id_foreign" foreign key ("area_id") references "test_section" ("id") on update cascade on delete cascade;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_callout_area_id" ON "test_callout" ("area_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_callout_area_id_rank" ON "test_callout" ("area_id", "rank") WHERE deleted_at IS NULL;`
    )

    this.addSql(`drop index if exists "IDX_test_step_section_id";`)
    this.addSql(`drop index if exists "IDX_test_step_section_id_rank";`)

    this.addSql(
      `alter table if exists "test_step" rename column "section_id" to "area_id";`
    )
    this.addSql(
      `alter table if exists "test_step" add constraint "test_step_area_id_foreign" foreign key ("area_id") references "test_section" ("id") on update cascade on delete cascade;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_step_area_id" ON "test_step" ("area_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_step_area_id_rank" ON "test_step" ("area_id", "rank") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "test_callout" drop constraint if exists "test_callout_area_id_foreign";`
    )

    this.addSql(
      `alter table if exists "test_step" drop constraint if exists "test_step_area_id_foreign";`
    )

    this.addSql(`drop index if exists "IDX_test_callout_area_id";`)
    this.addSql(`drop index if exists "IDX_test_callout_area_id_rank";`)

    this.addSql(
      `alter table if exists "test_callout" rename column "area_id" to "section_id";`
    )
    this.addSql(
      `alter table if exists "test_callout" add constraint "test_callout_section_id_foreign" foreign key ("section_id") references "test_section" ("id") on update cascade on delete cascade;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_callout_section_id" ON "test_callout" ("section_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_callout_section_id_rank" ON "test_callout" ("section_id", "rank") WHERE deleted_at IS NULL;`
    )

    this.addSql(`drop index if exists "IDX_test_step_area_id";`)
    this.addSql(`drop index if exists "IDX_test_step_area_id_rank";`)

    this.addSql(
      `alter table if exists "test_step" rename column "area_id" to "section_id";`
    )
    this.addSql(
      `alter table if exists "test_step" add constraint "test_step_section_id_foreign" foreign key ("section_id") references "test_section" ("id") on update cascade on delete cascade;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_step_section_id" ON "test_step" ("section_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_step_section_id_rank" ON "test_step" ("section_id", "rank") WHERE deleted_at IS NULL;`
    )
  }
}
