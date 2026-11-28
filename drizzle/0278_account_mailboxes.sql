CREATE TABLE "account_mailboxes" (
	"user_id" text NOT NULL,
	"mailbox_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "account_mailboxes_user_id_mailbox_hash_pk" PRIMARY KEY("user_id","mailbox_hash"),
	CONSTRAINT "account_mailboxes_mailbox_hash_unique" UNIQUE("mailbox_hash")
);
