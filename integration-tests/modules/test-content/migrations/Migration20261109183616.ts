import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261109183616 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "test_callout" ("id" text not null, "body" text null, "section_id" text not null, "rank" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "test_callout_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_callout_section_id" ON "test_callout" ("section_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_callout_deleted_at" ON "test_callout" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_callout_section_id_rank" ON "test_callout" ("section_id", "rank") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `alter table if exists "test_callout" add constraint "test_callout_section_id_foreign" foreign key ("section_id") references "test_section" ("id") on update cascade on delete cascade;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "test_callout" cascade;`)
  }
}
