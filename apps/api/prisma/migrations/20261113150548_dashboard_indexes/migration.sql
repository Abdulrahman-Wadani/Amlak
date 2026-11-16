-- CreateIndex
CREATE INDEX "assets_place_id_status_idx" ON "assets"("place_id", "status");

-- CreateIndex
CREATE INDEX "bookings_place_id_check_in_date_idx" ON "bookings"("place_id", "check_in_date");

-- CreateIndex
CREATE INDEX "bookings_place_id_check_out_date_idx" ON "bookings"("place_id", "check_out_date");

-- CreateIndex
CREATE INDEX "expenses_place_id_expense_date_idx" ON "expenses"("place_id", "expense_date");

-- CreateIndex
CREATE INDEX "maintenance_tickets_place_id_status_due_date_idx" ON "maintenance_tickets"("place_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "places_owner_id_idx" ON "places"("owner_id");
