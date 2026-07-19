import { isHTTPError, isNetworkError, isTimeoutError, KyError } from "ky";
import { INVALID_TOKEN, SERVER_UNAVAILABLE } from "@/shared/messages";

function isObject(maybeObj: unknown): maybeObj is Record<string, unknown> {
  return (
    typeof maybeObj === "object" &&
    typeof maybeObj !== "function" &&
    !Array.isArray(maybeObj) &&
    maybeObj !== null
  );
}

function isServerUnavailable(error: unknown): boolean {
  if (isNetworkError(error) || isTimeoutError(error)) {
    return true;
  }

  if (isHTTPError(error)) {
    const status = error.response.status;
    return status === 502 || status === 503 || status === 504;
  }

  // Некоторые рантаймы не оборачивают отказ fetch в NetworkError.
  if (error instanceof TypeError) {
    return true;
  }

  return false;
}

/** Приводит ошибку ky к читаемому KyError. 401 → маркер невалидного токена. */
export function mapError(error: unknown, defaultMessage: string) {
  if (isServerUnavailable(error)) {
    return new KyError(SERVER_UNAVAILABLE);
  }

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
