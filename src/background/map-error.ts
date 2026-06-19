import { isHTTPError, KyError } from "ky";
import { INVALID_TOKEN } from "@/shared/messages";

function isObject(maybeObj: unknown): maybeObj is Record<string, unknown> {
  return (
    typeof maybeObj === "object" &&
    typeof maybeObj !== "function" &&
    !Array.isArray(maybeObj) &&
    maybeObj !== null
  );
}

/** Приводит ошибку ky к читаемому KyError. 401 → маркер невалидного токена. */
export function mapError(error: unknown, defaultMessage: string) {
  if (isHTTPError(error)) {
    if (error.response.status === 401) {
      return new KyError(INVALID_TOKEN);
    }

    if (
      isObject(error.data) &&
      "error_description" in error.data &&
      typeof error.data.error_description === "string"
    ) {
      return new KyError(error.data.error_description);
    }
  }

  return new KyError(defaultMessage);
}
