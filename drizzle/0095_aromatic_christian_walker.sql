CREATE TABLE "token_ownership" (
	"user_id" text NOT NULL,
	"token_oracle_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"source" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "token_ownership_user_id_token_oracle_id_pk" PRIMARY KEY("user_id","token_oracle_id"),
	CONSTRAINT "token_ownership_quantity_positive" CHECK ("token_ownership"."quantity" > 0),
	CONSTRAINT "token_ownership_source_check" CHECK ("token_ownership"."source" in ('upload', 'manual'))
);
--> statement-breakpoint
CREATE TABLE "token_reads" (
	"user_id" text PRIMARY KEY NOT NULL,
	"upload_id" uuid,
	"read_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "token_ownership" ADD CONSTRAINT "token_ownership_token_oracle_id_tokens_oracle_id_fk" FOREIGN KEY ("token_oracle_id") REFERENCES "public"."tokens"("oracle_id") ON DELETE no action ON UPDATE no action;