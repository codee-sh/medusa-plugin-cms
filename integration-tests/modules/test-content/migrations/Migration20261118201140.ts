import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261118201140 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "test_tag" drop constraint if exists "test_tag_slug_unique";`
    )
    this.addSql(
      `create table if not exists "test_tag" ("id" text not null, "name" text not null, "slug" text null, "description" text null, "status" text check ("status" in ('draft', 'published')) not null default 'draft', "published_at" timestamptz null, "created_by" text null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "test_tag_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_tag_deleted_at" ON "test_tag" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_test_tag_slug_unique" ON "test_tag" ("slug") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "test_tag" cascade;`)
  }
}
