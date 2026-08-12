CREATE TABLE "background_image" (
	"background_image_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"storage_path" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"width_px" integer,
	"height_px" integer,
	"uploaded_by" uuid NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "background_image_file_size_check" CHECK ("background_image"."file_size_bytes" > 0),
	CONSTRAINT "background_image_status_check" CHECK ("background_image"."status" IN ('Active', 'Archived')),
	CONSTRAINT "background_image_mime_check" CHECK ("background_image"."mime_type" IN ('image/png', 'image/jpeg', 'image/webp'))
);
--> statement-breakpoint
ALTER TABLE "surface" ADD COLUMN "background_image_id" uuid;--> statement-breakpoint
ALTER TABLE "surface" ADD COLUMN "background_opacity" numeric(3, 2) DEFAULT 0.5 NOT NULL;--> statement-breakpoint
ALTER TABLE "surface" ADD COLUMN "background_fit" text DEFAULT 'contain' NOT NULL;--> statement-breakpoint
ALTER TABLE "background_image" ADD CONSTRAINT "background_image_uploaded_by_user_profile_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user_profile"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_background_image_storage_path" ON "background_image" USING btree ("storage_path");--> statement-breakpoint
ALTER TABLE "surface" ADD CONSTRAINT "surface_background_image_id_background_image_background_image_id_fk" FOREIGN KEY ("background_image_id") REFERENCES "public"."background_image"("background_image_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surface" ADD CONSTRAINT "surface_background_opacity_check" CHECK ("surface"."background_opacity" >= 0 AND "surface"."background_opacity" <= 1);--> statement-breakpoint
ALTER TABLE "surface" ADD CONSTRAINT "surface_background_fit_check" CHECK ("surface"."background_fit" IN ('contain', 'cover', 'stretch'));