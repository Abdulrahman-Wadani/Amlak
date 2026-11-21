// Plain object, so this file does not need vitest installed to be read.
// Values here only fill in what is missing: a real .env still wins for
// anything it sets, and the tests never connect to the database.
export default {
	test: {
		include: ["tests/**/*.test.ts"],
		env: {
			NODE_ENV: "test",
			DATABASE_URL: "postgresql://test:test@localhost:5432/test",
			JWT_SECRET: "test-secret-that-is-at-least-32-characters",
			S3_BUCKET: "test-bucket",
			S3_REGION: "us-east-1",
		},
	},
};
