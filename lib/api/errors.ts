export type ApiError = {
  message: string;
  status?: number;
  code?: string;
  requestId?: string;
  details?: unknown;
};

export function normalizeError(error: unknown): ApiError {
  if (typeof error === "object" && error && "isAxiosError" in error) {
    const err = error as {
      response?: { data?: { message?: string; code?: string }; status?: number; headers?: Record<string, string> };
      message?: string;
    };
    return {
      message: err.response?.data?.message ?? err.message ?? "Request failed",
      status: err.response?.status,
      code: err.response?.data?.code,
      requestId: err.response?.headers?.["x-request-id"] ?? err.response?.headers?.["request-id"],
      details: err.response?.data
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: "Unexpected error" };
}
