import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { z } from "zod";
import { getToken } from "@/lib/storage/token";
import { getEnigmaBaseUrl } from "@/lib/utils/enigma-url";
import { ApiError, normalizeError } from "./errors";

export type ApiResponse<T> = {
  data: T;
  requestId?: string;
};

export type RequestOptions<TSchema extends z.ZodTypeAny> = {
  schema: TSchema;
  requestId?: string;
} & AxiosRequestConfig;

let client: AxiosInstance | null = null;

function getClient() {
  if (client) return client;
  client = axios.create({
    baseURL: getEnigmaBaseUrl(),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "VMS"
    }
  });

  client.interceptors.request.use((config) => {
    const token = getToken();
    const requestId = (config as AxiosRequestConfig & { requestId?: string }).requestId;
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (requestId) {
      config.headers = config.headers ?? {};
      config.headers["X-Request-Id"] = requestId;
    }
    return config;
  });

  return client;
}

export async function apiRequest<TSchema extends z.ZodTypeAny>(
  options: RequestOptions<TSchema>
): Promise<ApiResponse<z.infer<TSchema>>> {
  try {
    const { schema, ...config } = options;
    const response = await getClient().request({ ...config });
    const parsed = schema.safeParse(response.data);
    if (!parsed.success) {
      throw new Error("Response validation failed");
    }
    return {
      data: parsed.data,
      requestId: response.headers?.["x-request-id"] ?? response.headers?.["request-id"]
    };
  } catch (error) {
    const normalized = normalizeError(error);
    throw normalized as ApiError;
  }
}
