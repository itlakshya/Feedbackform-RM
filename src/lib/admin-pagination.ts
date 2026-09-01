import { redirect } from "next/navigation";

export const ADMIN_PAGE_SIZE = 10;

export type PaginatedList<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function parsePage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export type QueryMap = Record<string, string | undefined>;
export type QuestionCategoryFilter = "all" | "faculty" | "general";

export function parseQuestionCategory(value: string | string[] | undefined): QuestionCategoryFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "faculty" || raw === "general" ? raw : "all";
}

export function pageHref(basePath: string, page: number, query?: QueryMap) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, value);
    }
  }
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}

export function paginationMeta(total: number, page: number, pageSize = ADMIN_PAGE_SIZE) {
  const safeSize = Math.min(50, Math.max(1, Math.trunc(pageSize) || ADMIN_PAGE_SIZE));
  const requestedPage = Math.max(1, Math.trunc(page) || 1);
  const totalPages = Math.max(1, Math.ceil(total / safeSize) || 1);
  const safePage = Math.min(requestedPage, totalPages);
  return { safeSize, safePage, totalPages, offset: (safePage - 1) * safeSize };
}

export function redirectIfStalePage(basePath: string, requestedPage: number, actualPage: number, query?: QueryMap) {
  if (requestedPage !== actualPage) {
    redirect(pageHref(basePath, actualPage, query));
  }
}
