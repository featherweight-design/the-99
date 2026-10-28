ALTER TABLE "precon_synopses" ADD COLUMN "role_basis" text DEFAULT 'classifier' NOT NULL;--> statement-breakpoint
ALTER TABLE "precon_synopses" DROP CONSTRAINT "precon_synopses_precon_file_contract_version_pk";--> statement-breakpoint
ALTER TABLE "precon_synopses" ADD CONSTRAINT "precon_synopses_precon_file_contract_version_role_basis_pk" PRIMARY KEY("precon_file","contract_version","role_basis");--> statement-breakpoint
ALTER TABLE "precon_synopses" ADD CONSTRAINT "precon_synopses_role_basis_check" CHECK ("precon_synopses"."role_basis" in ('labels', 'classifier'));
