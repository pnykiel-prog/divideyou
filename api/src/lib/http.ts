import type { Response } from 'express';

// Thrown anywhere in a handler to produce a clean JSON error response.
export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = 'error') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (msg: string) => new ApiError(400, msg, 'bad_request');
export const unauthorized = (msg = 'Unauthorized') => new ApiError(401, msg, 'unauthorized');
export const forbidden = (msg = 'Forbidden') => new ApiError(403, msg, 'forbidden');
export const notFound = (msg = 'Not found') => new ApiError(404, msg, 'not_found');

export function sendError(res: Response, err: unknown) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.code, error_message: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: 'server_error', error_message: 'Internal server error' });
}

// Wrap an async handler so thrown errors become JSON responses.
export const wrap =
  (fn: (...args: any[]) => Promise<any>) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch((e) => sendError(res, e));

export function pagination(query: any) {
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(query.per_page ?? query.perPage ?? '20', 10) || 20));
  return { page, perPage, skip: (page - 1) * perPage, take: perPage };
}
