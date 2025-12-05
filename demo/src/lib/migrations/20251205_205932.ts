import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "organizations" ADD COLUMN "industry" varchar;
  ALTER TABLE "organizations" ADD COLUMN "max_seats" numeric;
  ALTER TABLE "organizations" ADD COLUMN "website" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "organizations" DROP COLUMN "industry";
  ALTER TABLE "organizations" DROP COLUMN "max_seats";
  ALTER TABLE "organizations" DROP COLUMN "website";`)
}
