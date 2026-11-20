import assert from "node:assert/strict";
import { test } from "node:test";
import { createPlaceSchema, updatePlaceSchema } from "../src/index.ts";

const place = { place_name: "Chalet", place_type: "Chalet", city: "Riyadh" };

test("places use Saudi riyals only", () => {
	assert.ok(createPlaceSchema.safeParse(place).success);
	assert.ok(createPlaceSchema.safeParse({ ...place, currency: "SAR" }).success);
	const other = createPlaceSchema.safeParse({ ...place, currency: "AED" });
	assert.ok(!other.success);
	assert.deepEqual(other.error.issues[0]?.path, ["currency"]);
	// The currency never changes after creation.
	const update = updatePlaceSchema.safeParse({ currency: "AED" });
	assert.ok(update.success && !("currency" in update.data));
});

test("places use Saudi time only", () => {
	assert.ok(
		createPlaceSchema.safeParse({ ...place, timezone: "Asia/Riyadh" }).success,
	);
	const other = createPlaceSchema.safeParse({
		...place,
		timezone: "Asia/Dubai",
	});
	assert.ok(!other.success);
	assert.deepEqual(other.error.issues[0]?.path, ["timezone"]);
	const update = updatePlaceSchema.safeParse({ timezone: "Asia/Dubai" });
	assert.ok(update.success && !("timezone" in update.data));
});
