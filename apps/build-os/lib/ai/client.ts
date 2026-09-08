import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Lazy singleton: constructing Anthropic() with no API key doesn't throw
// until a request is actually made, which would surface as a confusing
// network-layer error deep inside an action. Failing fast here with a
// clear message is worth the extra function.
let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local (see .env.local.example) to use AI document classification or pricing suggestions.",
    );
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export const AI_MODEL = "claude-opus-5";
