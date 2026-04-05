import { Request } from "express";
import { PaginatedResult, PaginationParams } from "../../types";
import { PAGINATION_DEFAULTS } from "./constants";

export function paginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams,
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / params.limit);
  return {
    data,
    meta: {
      total,
      page: params.page,
      limit: params.limit,
      totalPages,
      hasNextPage: params.page < totalPages,
      hasPrevPage: params.page > 1,
    },
  };
}

export function parsePagination(query: Request["query"]): PaginationParams {
  const page = Math.max(
    1,
    parseInt(query.page as string, 10) || PAGINATION_DEFAULTS.PAGE,
  );
  const rawLimit =
    parseInt(query.limit as string, 10) || PAGINATION_DEFAULTS.LIMIT;
  const limit = Math.min(Math.max(1, rawLimit), PAGINATION_DEFAULTS.MAX_LIMIT);
  const sortBy = (query.sortBy as string) || "createdAt";
  const sortOrder =
    (query.sortOrder as string)?.toLowerCase() === "asc"
      ? "asc"
      : PAGINATION_DEFAULTS.SORT_ORDER;

  return { page, limit, sortBy, sortOrder };
}