ALTER TABLE "user" ADD COLUMN "password_hash" text;--> statement-breakpoint
-- Keep existing passwords: the hash format is unchanged.
UPDATE "user" SET "password_hash" = "account"."password" FROM "account" WHERE "account"."user_id" = "user"."id" AND "account"."provider_id" = 'credential';--> statement-breakpoint
-- Old sessions and links stored raw tokens; everyone signs in again.
DELETE FROM "session";--> statement-breakpoint
DELETE FROM "verification";--> statement-breakpoint
DROP TABLE "account" CASCADE;--> statement-breakpoint
CREATE INDEX "verification_value_index" ON "verification" USING btree ("value");
