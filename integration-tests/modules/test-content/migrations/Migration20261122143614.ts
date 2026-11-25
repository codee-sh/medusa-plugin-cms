import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261122143614 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "test_recipe" add column if not exists "related_recipe_id" text null;`
    )
    this.addSql(
      `alter table if exists "test_recipe" add constraint "test_recipe_related_recipe_id_foreign" foreign key ("related_recipe_id") references "test_recipe" ("id") on update cascade on delete set null;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_recipe_related_recipe_id" ON "test_recipe" ("related_recipe_id") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `alter table if exists "test_settings" add column if not exists "featured_recipe_id" text null;`
    )
    this.addSql(
      `alter table if exists "test_settings" add constraint "test_settings_featured_recipe_id_foreign" foreign key ("featured_recipe_id") references "test_recipe" ("id") on update cascade on delete set null;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_settings_featured_recipe_id" ON "test_settings" ("featured_recipe_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "test_recipe" drop constraint if exists "test_recipe_related_recipe_id_foreign";`
    )

    this.addSql(
      `alter table if exists "test_settings" drop constraint if exists "test_settings_featured_recipe_id_foreign";`
    )

    this.addSql(`drop index if exists "IDX_test_recipe_related_recipe_id";`)
    this.addSql(
      `alter table if exists "test_recipe" drop column if exists "related_recipe_id";`
    )

    this.addSql(`drop index if exists "IDX_test_settings_featured_recipe_id";`)
    this.addSql(
      `alter table if exists "test_settings" drop column if exists "featured_recipe_id";`
    )
  }
}
