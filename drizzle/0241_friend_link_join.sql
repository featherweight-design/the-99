-- Friend links R1, PR 2: a newcomer joins through a reusable friend link. `invite_reservations.link_key_id` names the link
-- key a QR-kind reservation was opened from (its hold is short and its spend writes a friend request), and an invite
-- edge of kind 'link' records such a join.
-- REVERSAL: DELETE FROM "invite_edges" WHERE "kind" = 'link' (or update them to 'qr'); drop and re-add
-- invite_edges_kind_check with ('email', 'qr'); DROP INDEX "invite_reservations_link_key_idx";
-- ALTER TABLE "invite_reservations" DROP COLUMN "link_key_id".
ALTER TABLE "invite_edges" DROP CONSTRAINT "invite_edges_kind_check";--> statement-breakpoint
ALTER TABLE "invite_reservations" ADD COLUMN "link_key_id" uuid;--> statement-breakpoint
ALTER TABLE "invite_reservations" ADD CONSTRAINT "invite_reservations_link_key_id_friend_link_keys_id_fk" FOREIGN KEY ("link_key_id") REFERENCES "public"."friend_link_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invite_reservations_link_key_idx" ON "invite_reservations" USING btree ("link_key_id") WHERE "invite_reservations"."link_key_id" is not null;--> statement-breakpoint
ALTER TABLE "invite_edges" ADD CONSTRAINT "invite_edges_kind_check" CHECK ("invite_edges"."kind" in ('email', 'qr', 'link'));