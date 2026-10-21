import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.string(),
  uptime: z.number().optional(),
  message: z.string().optional()
});

export const actionRunResponseSchema = z.object({
  id: z.string().optional(),
  status: z.string().optional(),
  message: z.string().optional(),
  result: z.unknown().optional()
});

export const historyItemSchema = z.object({
  id: z.string(),
  actionId: z.string().optional(),
  status: z.string().optional(),
  createdAt: z.string(),
  request: z.unknown().optional(),
  response: z.unknown().optional()
});

export const historyResponseSchema = z.object({
  items: z.array(historyItemSchema),
  page: z.number().optional(),
  pageSize: z.number().optional(),
  total: z.number().optional()
});

export const loginResponseSchema = z.object({
  token: z.string(),
  user: z
    .object({
      id: z.string().optional(),
      email: z.string().optional()
    })
    .optional()
});
