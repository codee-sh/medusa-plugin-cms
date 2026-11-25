import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261109093944 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "test_recipe" drop constraint if exists "test_recipe_slug_unique";`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_test_recipe_slug_unique" ON "test_recipe" ("slug") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_test_recipe_slug_unique";`)
  }
}
