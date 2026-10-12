CREATE TABLE "pod_spare_shares" (
	"user_id" text NOT NULL,
	"pod_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pod_spare_shares_user_id_pod_id_pk" PRIMARY KEY("user_id","pod_id")
);
--> statement-breakpoint
ALTER TABLE "pod_spare_shares" ADD CONSTRAINT "pod_spare_shares_pod_id_pods_id_fk" FOREIGN KEY ("pod_id") REFERENCES "public"."pods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pod_spare_shares_pod_idx" ON "pod_spare_shares" USING btree ("pod_id");--> statement-breakpoint
-- A grant moves its owner's data stamp, so a reader whose cached page keys on `friendGeneration` (the
-- spares-granting friends' stamps) misses when a friend shares or stops sharing.
DROP TRIGGER IF EXISTS user_data_touch ON "pod_spare_shares";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "pod_spare_shares"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('user_id');
