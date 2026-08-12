-- "auth"."users" đã tồn tại sẵn (Supabase Auth quản lý) — KHÔNG được tạo lại,
-- chỉ khai báo trong schema.ts để làm FK target. Migration generate tự động
-- có sinh ra CREATE TABLE "auth"."users" — đã xoá thủ công dòng đó khỏi file
-- này trước khi apply.
CREATE TABLE "user_profile" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"role" text DEFAULT 'Viewer' NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profile_role_check" CHECK ("user_profile"."role" IN ('Admin', 'Editor', 'Viewer')),
	CONSTRAINT "user_profile_status_check" CHECK ("user_profile"."status" IN ('Active', 'Archived'))
);
--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TRIGGER trg_user_profile_updated_at BEFORE UPDATE ON "user_profile"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
