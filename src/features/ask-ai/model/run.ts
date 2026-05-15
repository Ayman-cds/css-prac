import type { SupabaseClient } from "@supabase/supabase-js";
import { getAnthropic, HAIKU_MODEL } from "@/shared/api/anthropic";
import { TOOLS, runTool } from "../api/tools";
import type { SseEvent } from "@/shared/lib/sse";

export type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = (today: string) => `You are an analyst for a single user's QNB credit-card expense dashboard. All amounts are in Qatari Rial (QAR). Today is ${today}. The data belongs to the user; never refuse access or ask for permission.

Use the provided tools to answer. Never invent numbers — if you don't know, call a tool. When the user says "last month", "this year", "this week" etc., resolve the dates yourself using today's date.

Format answers as plain markdown. Lead with the specific number (in QAR). Keep responses tight — under 3 short paragraphs. Use **bold** for key figures. If you list transactions, max 5, formatted as a short bulleted list with merchant and amount.

If the user asks something the data can't answer (e.g. tax advice, predictions of future events), say so briefly and offer the closest fact you can derive.`;

type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };

/**
 * Run the agent loop. Yields SSE events:
 *   - { event: "delta", data: { text } }       — text chunk from Claude
 *   - { event: "tool_use", data: { name, input } }
 *   - { event: "tool_result", data: { name, output } }
 *   - { event: "done", data: {} }
 */
export async function* runAskAgent(
  messages: ChatMessage[],
  ctx: { supabase: SupabaseClient },
): AsyncGenerator<SseEvent, void, unknown> {
  const client = getAnthropic();
  if (!client) {
    yield {
      event: "delta",
      data: {
        text: "AI search isn't available — `ANTHROPIC_API_KEY` is not set on the server.",
      },
    };
    yield { event: "done", data: {} };
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  // Build the chat history for Claude. Tool-use turns accumulate locally.
  const convo: Array<{
    role: "user" | "assistant";
    content: string | AnthropicContentBlock[];
  }> = messages.map((m) => ({ role: m.role, content: m.content }));

  for (let step = 0; step < 6; step++) {
    const resp = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 1024,
      temperature: 0,
      system: SYSTEM_PROMPT(today),
      tools: TOOLS as unknown as Parameters<typeof client.messages.create>[0]["tools"],
      messages: convo as Parameters<typeof client.messages.create>[0]["messages"],
    });

    const blocks = resp.content as AnthropicContentBlock[];
    const toolUses = blocks.filter((b): b is Extract<AnthropicContentBlock, { type: "tool_use" }> => b.type === "tool_use");
    const texts = blocks.filter((b): b is Extract<AnthropicContentBlock, { type: "text" }> => b.type === "text");

    for (const t of texts) {
      if (t.text) yield { event: "delta", data: { text: t.text } };
    }

    if (resp.stop_reason !== "tool_use" || toolUses.length === 0) {
      yield { event: "done", data: {} };
      return;
    }

    // Add assistant turn (with tool uses) to history
    convo.push({ role: "assistant", content: blocks });

    // Run each tool, append a single user turn carrying tool_result blocks
    const toolResultBlocks: Array<{ type: "tool_result"; tool_use_id: string; content: string }> = [];
    for (const tu of toolUses) {
      yield { event: "tool_use", data: { name: tu.name, input: tu.input } };
      try {
        const output = await runTool(tu.name, tu.input, ctx);
        yield { event: "tool_result", data: { name: tu.name, output } };
        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: JSON.stringify(output),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        yield { event: "tool_result", data: { name: tu.name, error: msg } };
        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: JSON.stringify({ error: msg }),
        });
      }
    }

    convo.push({
      role: "user",
      content: toolResultBlocks as unknown as AnthropicContentBlock[],
    });
  }

  // Safety: ran out of steps
  yield {
    event: "delta",
    data: { text: "\n\n_(stopped: max tool steps reached)_" },
  };
  yield { event: "done", data: {} };
}
