CREATE INDEX IF NOT EXISTS "Service_category_price_idx"
  ON "Service" ("category", "price");

CREATE INDEX IF NOT EXISTS "Appointment_serviceId_idx"
  ON "Appointment" ("serviceId");

CREATE INDEX IF NOT EXISTS "InventoryItem_category_name_idx"
  ON "InventoryItem" ("category", "name");

CREATE INDEX IF NOT EXISTS "InventoryItem_quantity_idx"
  ON "InventoryItem" ("quantity");

CREATE INDEX IF NOT EXISTS "StockCheckSession_createdAt_idx"
  ON "StockCheckSession" ("createdAt");

CREATE INDEX IF NOT EXISTS "StockCheckSession_completedAt_idx"
  ON "StockCheckSession" ("completedAt");

CREATE INDEX IF NOT EXISTS "StockCheckEntry_sessionId_idx"
  ON "StockCheckEntry" ("sessionId");

CREATE INDEX IF NOT EXISTS "StockCheckEntry_itemId_idx"
  ON "StockCheckEntry" ("itemId");
