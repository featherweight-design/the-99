CREATE TABLE "friend_invites" (
	"token" text PRIMARY KEY NOT NULL,
	"inviter_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"redeemed_by" text,
	"redeemed_at" timestamp,
	"declined_at" timestamp,
	"revoked_at" timestamp,
	CONSTRAINT "friend_invites_one_end_check" CHECK ((case when "friend_invites"."redeemed_at" is null then 0 else 1 end) + (case when "friend_invites"."declined_at" is null then 0 else 1 end) + (case when "friend_invites"."revoked_at" is null then 0 else 1 end) <= 1),
	CONSTRAINT "friend_invites_redeemer_check" CHECK (("friend_invites"."redeemed_at" is null) = ("friend_invites"."redeemed_by" is null))
);
--> statement-breakpoint
CREATE TABLE "friend_links" (
	"user_id" text NOT NULL,
	"friend_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "friend_links_user_id_friend_user_id_pk" PRIMARY KEY("user_id","friend_user_id"),
	CONSTRAINT "friend_links_not_self_check" CHECK ("friend_links"."user_id" <> "friend_links"."friend_user_id")
);
--> statement-breakpoint
CREATE TABLE "pod_members" (
	"pod_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pod_members_pod_id_user_id_pk" PRIMARY KEY("pod_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "pods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pods_name_check" CHECK (char_length("pods"."name") between 1 and 40)
);
--> statement-breakpoint
CREATE TABLE "social_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "social_profiles_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "social_profiles_display_name_check" CHECK (char_length("social_profiles"."display_name") between 1 and 30)
);
--> statement-breakpoint
ALTER TABLE "pod_members" ADD CONSTRAINT "pod_members_pod_id_pods_id_fk" FOREIGN KEY ("pod_id") REFERENCES "public"."pods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "friend_invites_inviter_idx" ON "friend_invites" USING btree ("inviter_user_id","created_at");--> statement-breakpoint
CREATE INDEX "pod_members_user_idx" ON "pod_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pods_owner_idx" ON "pods" USING btree ("owner_user_id");--> statement-breakpoint
-- The reader's data stamp moves when their friend set or pod membership does, deferred to commit like
-- every other user_data_touch (0073). `befriend`/`unfriend` write a friendship's two rows in user_id
-- order, so two readers' stamps are always taken in the same order.
DROP TRIGGER IF EXISTS user_data_touch ON "friend_links";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "friend_links"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('user_id');
--> statement-breakpoint
DROP TRIGGER IF EXISTS user_data_touch ON "pod_members";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "pod_members"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('user_id');
