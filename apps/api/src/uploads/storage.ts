import { randomUUID } from "node:crypto";
import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import { config } from "../config.ts";
import { AppError } from "../errors.ts";

/** The parts of an uploaded file that storage needs. */
export type ImageFile = {
	fieldname: string; // the form field it came in, e.g. "picture"
	buffer: Buffer; // the file's bytes
};

const ACCEPTED_FORMATS = ["jpeg", "png", "webp"];
const MAX_SIDE = 1600; // pixels
const LINK_SECONDS = 60 * 60; // one hour

const s3 = new S3Client({
	region: config.S3_REGION,
	credentials: readCredentials(),
});

/**
 * Saves an uploaded image as WebP and returns its key, which is what goes in
 * the database. Rejects files that are not really JPEG, PNG or WebP.
 */
export async function storeImage(
	file: ImageFile,
	folder: string,
): Promise<string> {
	const isImage = await isAcceptedImage(file.buffer);
	if (!isImage) {
		const fields: Record<string, string> = {};
		fields[file.fieldname] = "Send a JPEG, PNG or WebP image";
		throw new AppError("VALIDATION_ERROR", "Some fields are invalid", {
			fields,
		});
	}

	const webp = await toWebp(file.buffer);
	const key = `${folder}/${randomUUID()}.webp`;

	await s3.send(
		new PutObjectCommand({
			Bucket: config.S3_BUCKET,
			Key: key,
			Body: webp,
			ContentType: "image/webp",
		}),
	);
	return key;
}

/** A link to a stored image that works for one hour. */
export async function imageUrl(key: string): Promise<string> {
	const command = new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: key });
	return await getSignedUrl(s3, command, { expiresIn: LINK_SECONDS });
}

export async function removeImage(key: string): Promise<void> {
	await s3.send(
		new DeleteObjectCommand({ Bucket: config.S3_BUCKET, Key: key }),
	);
}

function readCredentials() {
	if (!config.S3_ACCESS_KEY_ID || !config.S3_SECRET_ACCESS_KEY) {
		// On the EC2 server the library uses the server's IAM role instead.
		return undefined;
	}
	return {
		accessKeyId: config.S3_ACCESS_KEY_ID,
		secretAccessKey: config.S3_SECRET_ACCESS_KEY,
	};
}

/** Reads the file's real format from its bytes, not from its name. */
async function isAcceptedImage(buffer: Buffer): Promise<boolean> {
	try {
		const metadata = await sharp(buffer).metadata();
		return ACCEPTED_FORMATS.includes(metadata.format);
	} catch {
		// sharp could not read it, so it is not an image.
		return false;
	}
}

/**
 * Turns the photo upright, shrinks it to at most 1600 px on its longest side
 * and converts it to WebP. Metadata such as GPS location is dropped.
 */
async function toWebp(buffer: Buffer): Promise<Buffer> {
	return await sharp(buffer)
		.rotate()
		.resize({
			width: MAX_SIDE,
			height: MAX_SIDE,
			fit: "inside",
			withoutEnlargement: true,
		})
		.webp({ quality: 80 })
		.toBuffer();
}
