-- Places use Saudi time only for now, like the currency.
UPDATE "places" SET "timezone" = 'Asia/Riyadh' WHERE "timezone" <> 'Asia/Riyadh';
