import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261109122645 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "cms_version" ("id" text not null, "collection" text not null, "document_id" text not null, "version" integer not null, "snapshot" jsonb not null, "status" text check ("status" in ('draft', 'published')) not null, "latest" boolean not null default false, "changed_fields" text[] not null, "created_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "cms_version_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_cms_version_deleted_at" ON "cms_version" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_cms_version_document" ON "cms_version" ("collection", "document_id", "created_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cms_version_latest" ON "cms_version" ("collection", "document_id") WHERE latest = true AND deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cms_version_number" ON "cms_version" ("collection", "document_id", "version") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "cms_version" cascade;`);
  }

}
