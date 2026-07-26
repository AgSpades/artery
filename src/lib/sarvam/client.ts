import "server-only";

import { requireSarvamKey } from "@/lib/env";

export class SarvamProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly requestId?: string,
  ) {
    super(message);
  }
}

export async function sarvamFetch(
  path: string,
  init: RequestInit,
  timeoutMs = 20_000,
) {
  let env: ReturnType<typeof requireSarvamKey>;
  try {
    env = requireSarvamKey();
  } catch {
    throw new SarvamProviderError(
      "Live Sarvam integration requires SARVAM_API_KEY.",
      503,
      "SARVAM_NOT_CONFIGURED",
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${env.SARVAM_BASE_URL}${path}`, {
      ...init,
      headers: {
        "api-subscription-key": env.SARVAM_API_KEY,
        ...init.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: { message?: string; code?: string; request_id?: string } }
        | null;
      const requestId =
        body?.error?.request_id ?? response.headers.get("x-request-id") ?? undefined;
      if (requestId) console.error(`Sarvam request failed: ${requestId}`);
      throw new SarvamProviderError(
        body?.error?.message ?? "Sarvam request failed.",
        response.status,
        body?.error?.code ?? "SARVAM_PROVIDER_ERROR",
        requestId,
      );
    }
    return response;
  } catch (error) {
    if (error instanceof SarvamProviderError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new SarvamProviderError(
        "Sarvam did not respond in time. Your progress is safe.",
        504,
        "SARVAM_TIMEOUT",
      );
    }
    throw new SarvamProviderError(
      "Could not reach Sarvam. Your progress is safe.",
      502,
      "SARVAM_NETWORK_ERROR",
    );
  } finally {
    clearTimeout(timer);
  }
}
