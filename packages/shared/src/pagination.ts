export type Pagination = {
	page: number;
	page_size: number;
	total: number;
	total_pages: number;
};

export type Paginated<T> = { data: T[]; pagination: Pagination };
