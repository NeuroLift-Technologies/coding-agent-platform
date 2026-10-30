CREATE TABLE "provider_connections" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "provider" text NOT NULL,
  "external_account_id" text,
  "display_name" text,
  "access_token" text NOT NULL,
  "refresh_token" text,
  "expires_at" timestamp,
  "scope" text,
  "metadata" jsonb,
  "status" text DEFAULT 'connected' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "provider_connections" ADD CONSTRAINT "provider_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "provider_connections_user_provider_idx" ON "provider_connections" USING btree ("user_id","provider");
