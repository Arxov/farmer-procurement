export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export function getPagination(query: Partial<{ page?: string; limit?: string }>, defaultLimit = 20): PaginationParams {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || String(defaultLimit), 10) || defaultLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function paginatedResponse<T>(data: T[], total: number, { page, limit }: PaginationParams) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    }
  };
}
