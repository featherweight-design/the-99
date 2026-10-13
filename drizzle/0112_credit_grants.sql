CREATE TABLE "credit_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"source" text NOT NULL,
	"units" integer NOT NULL,
	"revoked_units" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp,
	"external_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "credit_grants_external_id_unique" UNIQUE("external_id"),
	CONSTRAINT "credit_grants_source_check" CHECK ("credit_grants"."source" in ('plan', 'pack')),
	CONSTRAINT "credit_grants_units_check" CHECK ("credit_grants"."units" > 0),
	CONSTRAINT "credit_grants_revoked_check" CHECK ("credit_grants"."revoked_units" between 0 and "credit_grants"."units"),
	CONSTRAINT "credit_grants_pack_never_expires_check" CHECK ("credit_grants"."source" = 'plan' or "credit_grants"."expires_at" is null)
);
--> statement-breakpoint
ALTER TABLE "model_calls" ADD COLUMN "credit_grant_id" uuid;--> statement-breakpoint
CREATE INDEX "credit_grants_user_idx" ON "credit_grants" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_credit_grant_id_credit_grants_id_fk" FOREIGN KEY ("credit_grant_id") REFERENCES "public"."credit_grants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "model_calls_credit_grant_idx" ON "model_calls" USING btree ("credit_grant_id") WHERE "model_calls"."credit_grant_id" is not null;