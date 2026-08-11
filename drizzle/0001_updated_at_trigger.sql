-- TD-05 §104: updated_at phải do Database kiểm soát, không để Frontend/Backend tự ghi.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER trg_retailer_updated_at BEFORE UPDATE ON "retailer"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_store_updated_at BEFORE UPDATE ON "store"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_fixture_updated_at BEFORE UPDATE ON "fixture"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_surface_updated_at BEFORE UPDATE ON "surface"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_display_position_updated_at BEFORE UPDATE ON "display_position"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_product_updated_at BEFORE UPDATE ON "product"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_product_assignment_updated_at BEFORE UPDATE ON "product_assignment"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
