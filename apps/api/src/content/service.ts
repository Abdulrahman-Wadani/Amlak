import type {
	CreateContentInput,
	ListContentQuery,
	Paginated,
	UpdateContentInput,
	WebContent,
} from "@amlak/shared";
import type { AuthUser } from "../auth/tokens.ts";
import { prisma } from "../db.ts";
import { AppError } from "../errors.ts";
import type {
	Language,
	Prisma,
	WebContent as WebContentRow,
} from "../generated/prisma/client.ts";
import { type Page, paginated } from "../pagination.ts";
import { toWebContent } from "./present.ts";

/** Admins see drafts too; everyone else, logged in or not, sees published pages. */
function visibleContent(viewer: AuthUser | null): Prisma.WebContentWhereInput {
	if (viewer?.role === "ADMIN") {
		return {};
	}
	return { is_published: true };
}

export async function listContent(
	viewer: AuthUser | null,
	query: ListContentQuery,
	page: Page,
): Promise<Paginated<WebContent>> {
	const where = {
		...visibleContent(viewer),
		language: query.language,
		slug: query.slug,
	};
	const [rows, total] = await prisma.$transaction([
		prisma.webContent.findMany({
			where,
			orderBy: [{ language: "asc" }, { slug: "asc" }],
			skip: page.skip,
			take: page.take,
		}),
		prisma.webContent.count({ where }),
	]);
	return paginated(rows.map(toWebContent), total, page);
}

/** A draft is 404 for anyone but an Admin, as if it did not exist. */
export async function getContent(
	viewer: AuthUser | null,
	contentId: string,
): Promise<WebContent> {
	const row = await prisma.webContent.findFirst({
		where: { id: contentId, ...visibleContent(viewer) },
	});
	if (!row) {
		throw new AppError("NOT_FOUND", "Page not found");
	}
	return toWebContent(row);
}

export async function createContent(
	admin: AuthUser,
	input: CreateContentInput,
): Promise<WebContent> {
	await assertSlugFree(input.language, input.slug, null);
	const row = await prisma.webContent.create({
		data: {
			author_id: admin.user_id,
			title: input.title,
			language: input.language,
			slug: input.slug,
			body: input.body,
			is_published: input.is_published,
		},
	});
	return toWebContent(row);
}

export async function updateContent(
	contentId: string,
	input: UpdateContentInput,
): Promise<WebContent> {
	const page = await findPage(contentId);
	if (input.slug) {
		await assertSlugFree(page.language, input.slug, page.id);
	}
	const row = await prisma.webContent.update({
		where: { id: page.id },
		data: input,
	});
	return toWebContent(row);
}

export async function deleteContent(contentId: string): Promise<void> {
	const page = await findPage(contentId);
	await prisma.webContent.delete({ where: { id: page.id } });
}

async function findPage(contentId: string): Promise<WebContentRow> {
	const page = await prisma.webContent.findUnique({ where: { id: contentId } });
	if (!page) {
		throw new AppError("NOT_FOUND", "Page not found");
	}
	return page;
}

/** A slug is unique per language. `exceptId` is the page being edited. */
async function assertSlugFree(
	language: Language,
	slug: string,
	exceptId: string | null,
): Promise<void> {
	const taken = await prisma.webContent.findUnique({
		where: { language_slug: { language, slug } },
		select: { id: true },
	});
	if (taken && taken.id !== exceptId) {
		throw new AppError("CONFLICT", "This slug is taken in this language", {
			fields: { slug: "Choose another slug" },
		});
	}
}
