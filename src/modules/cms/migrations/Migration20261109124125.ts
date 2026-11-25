import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261109124125 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "cms_version" add column if not exists "change_type" text not null, add column if not exists "restored_from" integer null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "cms_version" drop column if exists "change_type", drop column if exists "restored_from";`);
  }

}
