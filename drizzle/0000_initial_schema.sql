CREATE TABLE "display_position" (
	"position_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"surface_id" uuid NOT NULL,
	"display_type" text NOT NULL,
	"x" numeric(10, 2) NOT NULL,
	"y" numeric(10, 2) NOT NULL,
	"width_mm" numeric(10, 2) NOT NULL,
	"height_mm" numeric(10, 2) NOT NULL,
	"capacity" integer,
	"facing_limit" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "position_width_check" CHECK ("display_position"."width_mm" > 0),
	CONSTRAINT "position_height_check" CHECK ("display_position"."height_mm" > 0),
	CONSTRAINT "position_display_type_check" CHECK ("display_position"."display_type" IN ('Shelf', 'Hook', 'Basket', 'Tray', 'Pegboard', 'Other')),
	CONSTRAINT "position_capacity_check" CHECK ("display_position"."capacity" IS NULL OR "display_position"."capacity" >= 0),
	CONSTRAINT "position_facing_limit_check" CHECK ("display_position"."facing_limit" IS NULL OR "display_position"."facing_limit" >= 1),
	CONSTRAINT "position_status_check" CHECK ("display_position"."status" IN ('Active', 'Archived'))
);
--> statement-breakpoint
CREATE TABLE "fixture" (
	"fixture_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"fixture_code" text NOT NULL,
	"fixture_name" text NOT NULL,
	"owner_company" text NOT NULL,
	"fixture_type" text,
	"width_mm" numeric(10, 2) NOT NULL,
	"height_mm" numeric(10, 2) NOT NULL,
	"depth_mm" numeric(10, 2) NOT NULL,
	"position_x" numeric(10, 2) DEFAULT '0' NOT NULL,
	"position_y" numeric(10, 2) DEFAULT '0' NOT NULL,
	"rotation_degree" numeric(6, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fixture_width_check" CHECK ("fixture"."width_mm" > 0),
	CONSTRAINT "fixture_height_check" CHECK ("fixture"."height_mm" > 0),
	CONSTRAINT "fixture_depth_check" CHECK ("fixture"."depth_mm" > 0),
	CONSTRAINT "fixture_owner_company_check" CHECK ("fixture"."owner_company" IN ('Uncel Bills', 'Competitor')),
	CONSTRAINT "fixture_status_check" CHECK ("fixture"."status" IN ('Active', 'Archived'))
);
--> statement-breakpoint
CREATE TABLE "product" (
	"product_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_code" text NOT NULL,
	"description" text NOT NULL,
	"category" text,
	"product_group" text,
	"brand" text,
	"image_url" text,
	"width_mm" numeric(10, 2),
	"height_mm" numeric(10, 2),
	"depth_mm" numeric(10, 2),
	"status" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_width_check" CHECK ("product"."width_mm" IS NULL OR "product"."width_mm" > 0),
	CONSTRAINT "product_height_check" CHECK ("product"."height_mm" IS NULL OR "product"."height_mm" > 0),
	CONSTRAINT "product_depth_check" CHECK ("product"."depth_mm" IS NULL OR "product"."depth_mm" > 0),
	CONSTRAINT "product_status_check" CHECK ("product"."status" IN ('Active', 'Archived'))
);
--> statement-breakpoint
CREATE TABLE "product_assignment" (
	"assignment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"position_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"facing_qty" integer NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"start_date" date,
	"end_date" date,
	"status" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assignment_facing_qty_check" CHECK ("product_assignment"."facing_qty" >= 1),
	CONSTRAINT "assignment_date_check" CHECK ("product_assignment"."start_date" IS NULL OR "product_assignment"."end_date" IS NULL OR "product_assignment"."start_date" <= "product_assignment"."end_date"),
	CONSTRAINT "assignment_status_check" CHECK ("product_assignment"."status" IN ('Active', 'Archived'))
);
--> statement-breakpoint
CREATE TABLE "retailer" (
	"retailer_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"retailer_code" text NOT NULL,
	"retailer_name" text NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "retailer_status_check" CHECK ("retailer"."status" IN ('Active', 'Archived'))
);
--> statement-breakpoint
CREATE TABLE "store" (
	"store_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"retailer_id" uuid NOT NULL,
	"store_code" text NOT NULL,
	"store_name" text NOT NULL,
	"address" text,
	"status" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_status_check" CHECK ("store"."status" IN ('Active', 'Archived'))
);
--> statement-breakpoint
CREATE TABLE "surface" (
	"surface_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fixture_id" uuid NOT NULL,
	"surface_name" text,
	"orientation" text NOT NULL,
	"width_mm" numeric(10, 2) NOT NULL,
	"height_mm" numeric(10, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "surface_width_check" CHECK ("surface"."width_mm" > 0),
	CONSTRAINT "surface_height_check" CHECK ("surface"."height_mm" > 0),
	CONSTRAINT "surface_orientation_check" CHECK ("surface"."orientation" IN ('Front', 'Back', 'Left', 'Right', 'Top')),
	CONSTRAINT "surface_status_check" CHECK ("surface"."status" IN ('Active', 'Archived'))
);
--> statement-breakpoint
ALTER TABLE "display_position" ADD CONSTRAINT "display_position_surface_id_surface_surface_id_fk" FOREIGN KEY ("surface_id") REFERENCES "public"."surface"("surface_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixture" ADD CONSTRAINT "fixture_store_id_store_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("store_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_assignment" ADD CONSTRAINT "product_assignment_position_id_display_position_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."display_position"("position_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_assignment" ADD CONSTRAINT "product_assignment_product_id_product_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("product_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store" ADD CONSTRAINT "store_retailer_id_retailer_retailer_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailer"("retailer_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surface" ADD CONSTRAINT "surface_fixture_id_fixture_fixture_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixture"("fixture_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_position_surface" ON "display_position" USING btree ("surface_id");--> statement-breakpoint
CREATE INDEX "idx_fixture_store" ON "fixture" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_fixture_code" ON "fixture" USING btree ("fixture_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_product_item_code" ON "product" USING btree ("item_code");--> statement-breakpoint
CREATE INDEX "idx_assignment_position" ON "product_assignment" USING btree ("position_id");--> statement-breakpoint
CREATE INDEX "idx_assignment_product" ON "product_assignment" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_assignment_active_position" ON "product_assignment" USING btree ("position_id") WHERE "product_assignment"."status" = 'Active';--> statement-breakpoint
CREATE UNIQUE INDEX "uq_retailer_code" ON "retailer" USING btree ("retailer_code");--> statement-breakpoint
CREATE INDEX "idx_store_retailer" ON "store" USING btree ("retailer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_store_code" ON "store" USING btree ("store_code");--> statement-breakpoint
CREATE INDEX "idx_surface_fixture" ON "surface" USING btree ("fixture_id");