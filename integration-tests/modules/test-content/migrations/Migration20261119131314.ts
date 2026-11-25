import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261119131314 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "test_settings" ("id" text not null, "title" text null, "featured_note" text null, "status" text check ("status" in ('draft', 'published')) not null default 'draft', "published_at" timestamptz null, "created_by" text null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "test_settings_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_settings_deleted_at" ON "test_settings" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "test_settings" cascade;`)
  }
}
