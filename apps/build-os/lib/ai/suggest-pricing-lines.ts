import "server-only";
import { getAnthropicClient, AI_MODEL } from "./client";

export interface SuggestedPricingLine {
  description: string;
  unit: string | null;
  quantity: number;
  rate: number;
  costType: "direct" | "indirect";
}

// Spec 5: AI-suggested pricing lines, always inserted with is_ai_generated
// = true and ai_confirmed_at = null by the caller — this module only
// proposes numbers, it never writes to the database. Confirmation (and
// the pricing engine excluding unconfirmed lines from every total until
// then) lives in 0014_ai_generated_line_confirmation.sql and the Estimate
// tab's Confirm action, not here.
export async function suggestPricingLines(documentText: string, categoryLabel: string | null): Promise<SuggestedPricingLine[]> {
  const client = getAnthropicClient();

  const tool = {
    name: "suggest_pricing_lines",
    description: "Propose pricing schedule line items extracted or inferred from a tender document.",
    input_schema: {
      type: "object" as const,
      properties: {
        lines: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              unit: { type: "string", description: "e.g. m2, m3, item, sum. Empty string if not applicable." },
              quantity: { type: "number" },
              rate: { type: "number", description: "Estimated rate per unit in the project's currency. 0 if genuinely unknown." },
              cost_type: { type: "string", enum: ["direct", "indirect"] },
            },
            required: ["description", "unit", "quantity", "rate", "cost_type"],
            additionalProperties: false,
          },
        },
      },
      required: ["lines"],
      additionalProperties: false,
    },
    strict: true,
  };

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    system:
      "You are assisting a quantity surveyor. Given a construction tender document" +
      (categoryLabel ? ` (category: ${categoryLabel})` : "") +
      ", propose a short list of pricing schedule line items it implies — only items with a reasonably identifiable scope, quantity, and unit. Leave rate at 0 when it genuinely cannot be estimated from the text rather than guessing a plausible-looking number. Use the suggest_pricing_lines tool exactly once.",
    tools: [tool],
    tool_choice: { type: "tool", name: "suggest_pricing_lines" },
    messages: [{ role: "user", content: documentText.slice(0, 30000) }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Pricing line suggestion failed: the model did not return a tool call.");
  }

  const input = toolUse.input as {
    lines: { description: string; unit: string; quantity: number; rate: number; cost_type: "direct" | "indirect" }[];
  };

  return input.lines.map((line) => ({
    description: line.description,
    unit: line.unit || null,
    quantity: line.quantity,
    rate: line.rate,
    costType: line.cost_type,
  }));
}
