import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261120082853 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "test_settings_link" ("id" text not null, "label" text null, "url" text null, "status" text check ("status" in ('draft', 'published')) not null default 'draft', "published_at" timestamptz null, "created_by" text null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "test_settings_link_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_settings_link_deleted_at" ON "test_settings_link" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "test_settings_link" cascade;`)
  }
}
