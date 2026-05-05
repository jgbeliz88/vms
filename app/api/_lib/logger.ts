import "server-only";
import { randomUUID } from "crypto";
import { EVENT_TYPE, Logger, FUNCTION, STATUS } from "@mediaset/logger";

interface LogParams {
  name: string;
  fn: string;
  msg: string;
  data?: unknown;
}

export function logInfo({ name, fn, msg, data }: LogParams) {
  const traceId = randomUUID();
  Logger.addEvent<FUNCTION>(
    { name, type: EVENT_TYPE.FUNCTION, fn, msg, status: STATUS.OK, data: JSON.stringify(data) },
    traceId,
  );
  Logger.dumpLog(traceId, true);
}

export function logError({ name, fn, msg, error }: Omit<LogParams, "data"> & { error: unknown }) {
  const traceId = randomUUID();
  const data = error instanceof Error
    ? { message: error.message, stack: error.stack, name: error.name, cause: error.cause }
    : error;
  Logger.addEvent<FUNCTION>(
    { name, type: EVENT_TYPE.FUNCTION, fn, msg, status: STATUS.ERR, data: JSON.stringify(data) },
    traceId,
  );
  Logger.dumpLog(traceId, true);
}
