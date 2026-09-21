import "server-only";

import type { AIProvider } from "./provider";

/**
 * Get the configured AI provider.
 * Reads AI_PROVIDER env var. Registered: "mock" only.
 * Throws on unknown provider or "mock" in production.
 */
export function getProvider(): AIProvider {
  const providerName = process.env.AI_PROVIDER || "mock";

  if (providerName === "mock") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        'AI_PROVIDER="mock" is not allowed in production. Set a real provider.'
      );
    }
    // Lazy import to avoid loading mock code unless needed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MockAIProvider } = require("./mock") as typeof import("./mock");
    return new MockAIProvider();
  }

  throw new Error(
    `Unknown AI_PROVIDER="${providerName}". Registered providers: mock. ` +
      `Set AI_PROVIDER to a valid provider name.`
  );
}
