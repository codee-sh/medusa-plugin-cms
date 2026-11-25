import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261110201858 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "test_recipe" add column if not exists "gallery" text[] null;`
    )
    this.addSql(
      `alter table if exists "test_recipe" rename column "cover_asset_id" to "cover";`
    )

    this.addSql(
      `alter table if exists "test_callout" add column if not exists "image" text null, add column if not exists "metadata" jsonb null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "test_recipe" drop column if exists "gallery";`
    )

    this.addSql(
      `alter table if exists "test_recipe" rename column "cover" to "cover_asset_id";`
    )

    this.addSql(
      `alter table if exists "test_callout" drop column if exists "image", drop column if exists "metadata";`
    )
  }
}
