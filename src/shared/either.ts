import { right, left, type Either } from "@sweet-monads/either";
import { KyError } from "ky";
import { INVALID_TOKEN } from "@/shared/messages";

/**
 * Мост Either через границу popup ↔ service worker.
 *
 * Either нельзя передать через chrome.runtime.sendMessage: structured clone
 * срежет прототип и потеряются методы (.fold/.isLeft/.value). Поэтому на границе
 * сворачиваем Either в плоский DTO (serialize, сторона воркера), а на приёме
 * разворачиваем обратно (deserialize, сторона popup). Обе половины — здесь.
 */
export type SerializedEither<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; invalidToken: boolean };

export function serializeEither<T>(
  either: Either<KyError, T>,
): SerializedEither<T> {
  return either.fold<SerializedEither<T>>(
    (error) => ({
      ok: false,
      error: error.message,
      invalidToken: error.message === INVALID_TOKEN,
    }),
    (data) => ({ ok: true, data }),
  );
}

export function deserializeEither<T>(
  serialized: SerializedEither<T>,
): Either<KyError, T> {
  return serialized.ok
    ? right(serialized.data)
    : left(new KyError(serialized.error));
}
