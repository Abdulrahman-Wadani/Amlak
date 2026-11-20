-- Places use Saudi riyals only for now. Only the label changes: amounts are
-- kept as they were entered.
UPDATE "places" SET "currency" = 'SAR' WHERE "currency" <> 'SAR';
