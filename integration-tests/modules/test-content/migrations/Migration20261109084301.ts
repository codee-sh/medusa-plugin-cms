import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261109084301 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "test_section" drop constraint if exists "test_section_recipe_id_name_unique";`
    )
    this.addSql(
      `create table if not exists "test_recipe" ("id" text not null, "title" text null, "slug" text null, "servings" integer null, "vegan" boolean not null default false, "cooked_at" timestamptz null, "difficulty" text check ("difficulty" in ('easy', 'hard')) not null default 'easy', "labels" text[] null, "cover_asset_id" text null, "notes" text not null, "extra" jsonb null, "metadata" jsonb null, "status" text check ("status" in ('draft', 'published')) not null default 'draft', "published_at" timestamptz null, "created_by" text null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "test_recipe_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_recipe_deleted_at" ON "test_recipe" ("deleted_at") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "test_section" ("id" text not null, "name" text not null, "parent_id" text null, "recipe_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "test_section_pkey" primary key ("id"), constraint CHK_owner check (num_nonnulls(recipe_id) = 1));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_section_recipe_id" ON "test_section" ("recipe_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_section_deleted_at" ON "test_section" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_test_section_recipe_id_name_unique" ON "test_section" ("recipe_id", "name") WHERE recipe_id IS NOT NULL AND deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "test_step" ("id" text not null, "heading" text null, "section_id" text not null, "rank" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "test_step_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_step_section_id" ON "test_step" ("section_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_step_deleted_at" ON "test_step" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_step_section_id_rank" ON "test_step" ("section_id", "rank") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "test_tip" ("id" text not null, "text" text null, "step_id" text not null, "rank" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "test_tip_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_tip_step_id" ON "test_tip" ("step_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_test_tip_deleted_at" ON "test_tip" ("deleted_at") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `alter table if exists "test_section" add constraint "test_section_recipe_id_foreign" foreign key ("recipe_id") references "test_recipe" ("id") on update cascade on delete cascade;`
    )

    this.addSql(
      `alter table if exists "test_step" add constraint "test_step_section_id_foreign" foreign key ("section_id") references "test_section" ("id") on update cascade on delete cascade;`
    )

    this.addSql(
      `alter table if exists "test_tip" add constraint "test_tip_step_id_foreign" foreign key ("step_id") references "test_step" ("id") on update cascade on delete cascade;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "test_section" drop constraint if exists "test_section_recipe_id_foreign";`
    )

    this.addSql(
      `alter table if exists "test_step" drop constraint if exists "test_step_section_id_foreign";`
    )

    this.addSql(
      `alter table if exists "test_tip" drop constraint if exists "test_tip_step_id_foreign";`
    )

    this.addSql(`drop table if exists "test_recipe" cascade;`)

    this.addSql(`drop table if exists "test_section" cascade;`)

    this.addSql(`drop table if exists "test_step" cascade;`)

    this.addSql(`drop table if exists "test_tip" cascade;`)
  }
}
