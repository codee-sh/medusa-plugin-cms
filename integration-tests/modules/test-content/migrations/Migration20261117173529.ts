import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261117173529 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "test_recipe" add column if not exists "summary" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "test_recipe" drop column if exists "summary";`
    )
  }
}
