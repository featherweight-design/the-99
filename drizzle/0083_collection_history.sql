CREATE TABLE "collection_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"kind" text NOT NULL,
	"source" text,
	"rows" jsonb,
	"pruned_at" timestamp,
	"raised" integer NOT NULL,
	"lowered" integer NOT NULL,
	"reverts_id" uuid,
	"reverted_by" uuid,
	CONSTRAINT "collection_history_seq_unique" UNIQUE("seq"),
	CONSTRAINT "collection_history_reverts_id_unique" UNIQUE("reverts_id"),
	CONSTRAINT "collection_history_kind_check" CHECK ("collection_history"."kind" in ('upload_replace', 'upload_add', 'add', 'edit', 'revert'))
);
--> statement-breakpoint
ALTER TABLE "collection_history" ADD CONSTRAINT "collection_history_reverts_id_collection_history_id_fk" FOREIGN KEY ("reverts_id") REFERENCES "public"."collection_history"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_history" ADD CONSTRAINT "collection_history_reverted_by_collection_history_id_fk" FOREIGN KEY ("reverted_by") REFERENCES "public"."collection_history"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collection_history_user_created_idx" ON "collection_history" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
-- Home's score compute reads this table (the collection generation, recs/store.ts), so it carries
-- the reader's data stamp like every other per-user table Home reads. Every ledger write also
-- writes collection_items, which moves the stamp already; this keeps check:list-cache's rule whole.
DROP TRIGGER IF EXISTS user_data_touch ON "collection_history";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "collection_history"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('user_id');
