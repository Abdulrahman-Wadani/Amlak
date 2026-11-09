import type { Request } from "express";
import multer, { type FileFilterCallback } from "multer";
import { AppError } from "../errors.ts";
import type { ImageFile } from "./storage.ts";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Reads a multipart/form-data body: up to `maxCount` images from the `field`
 * part, kept in memory, and the text fields into req.body. Files over 10 MB,
 * extra files and files that do not say they are images are 422.
 */
export function imageFiles(field: string, maxCount: number) {
	const upload = multer({
		storage: multer.memoryStorage(),
		limits: { fileSize: MAX_BYTES },
		fileFilter: onlyImages,
	});
	return upload.array(field, maxCount);
}

/** The images that imageFiles() read from the request. */
export function uploadedImages(req: Request): ImageFile[] {
	if (Array.isArray(req.files)) {
		return req.files;
	}
	return [];
}

// A quick first check on the type the browser reports. storage.ts checks the
// real bytes later, since this type is easy to fake.
function onlyImages(
	_req: Request,
	file: Express.Multer.File,
	done: FileFilterCallback,
): void {
	if (IMAGE_TYPES.includes(file.mimetype)) {
		done(null, true);
		return;
	}
	const fields: Record<string, string> = {};
	fields[file.fieldname] = "Send a JPEG, PNG or WebP image";
	done(new AppError("VALIDATION_ERROR", "Some fields are invalid", { fields }));
}
