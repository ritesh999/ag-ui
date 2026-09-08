import "server-only";
import { getAnthropicClient, AI_MODEL } from "./client";

export interface DocumentCategoryOption {
  code: string;
  label: string;
}

export interface ClassificationResult {
  categoryCode: string | null;
  confidence: "low" | "medium" | "high";
  reasoning: string;
}

// Structured output via a forced single tool call (strict: true) rather
// than asking for free-text JSON — guarantees a schema-valid response
// with no parsing/repair step. See spec 5: "AI-assisted document
// analysis" / project_documents.category_id's own comment ("may fail to
// confidently classify a document") for why "none of these confidently"
// is a real, expected answer, not a failure to design around.
export async function classifyDocument(
  text: string | null,
  fileName: string,
  categories: DocumentCategoryOption[],
): Promise<ClassificationResult> {
  const client = getAnthropicClient();

  // "none" is a plain string enum member rather than JSON null — keeps
  // the schema to plain single-typed properties, which is the pattern
  // strict:true is documented and tested against.
  const categoryCodes = categories.map((c) => c.code);
  const tool = {
    name: "classify_document",
    description: "Classify a construction tender document into one of the project's document categories.",
    input_schema: {
      type: "object" as const,
      properties: {
        category_code: {
          type: "string",
          enum: [...categoryCodes, "none"],
          description: "The best-matching category code, or \"none\" if none confidently matches.",
        },
        confidence: { type: "string", enum: ["low", "medium", "high"] },
        reasoning: { type: "string", description: "One sentence explaining the classification." },
      },
      required: ["category_code", "confidence", "reasoning"],
      additionalProperties: false,
    },
    strict: true,
  };

  const categoryList = categories.map((c) => `- ${c.code}: ${c.label}`).join("\n");
  const content = text
    ? `Document filename: ${fileName}\n\nDocument text (may be truncated):\n${text.slice(0, 15000)}`
    : `Document filename: ${fileName}\n\n(No extracted text is available for this file type — classify from the filename alone, and use low confidence unless the filename is unambiguous.)`;

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
    system: `You classify construction tender documents for a pre-construction estimating platform. Categories:\n${categoryList}\n\nUse the classify_document tool exactly once.`,
    tools: [tool],
    tool_choice: { type: "tool", name: "classify_document" },
    messages: [{ role: "user", content }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Classification failed: the model did not return a tool call.");
  }

  const input = toolUse.input as { category_code: string; confidence: "low" | "medium" | "high"; reasoning: string };
  return {
    categoryCode: input.category_code === "none" ? null : input.category_code,
    confidence: input.confidence,
    reasoning: input.reasoning,
  };
}
