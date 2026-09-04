import { getPagination, paginatedResponse } from '@/lib/pagination';

describe('Pagination Utilities', () => {
  it('getPagination extracts page and limit and calculates offset', () => {
    const result = getPagination({ page: '2', limit: '10' });
    expect(result).toEqual({ page: 2, limit: 10, offset: 10 });
  });

  it('getPagination falls back to defaults for missing parameters', () => {
    const result = getPagination({}, 25);
    expect(result).toEqual({ page: 1, limit: 25, offset: 0 });
  });

  it('getPagination caps limit to 100', () => {
    const result = getPagination({ limit: '500' });
    expect(result.limit).toBe(100);
  });

  it('paginatedResponse formats standard response', () => {
    const data = [{ id: 1 }, { id: 2 }];
    const total = 25;
    const params = { page: 2, limit: 10, offset: 10 };

    const result = paginatedResponse(data, total, params);

    expect(result.data).toEqual(data);
    expect(result.pagination.total).toBe(25);
    expect(result.pagination.totalPages).toBe(3);
    expect(result.pagination.hasNext).toBe(true);
    expect(result.pagination.hasPrev).toBe(true);
  });
});
