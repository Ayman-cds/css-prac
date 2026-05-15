export type SseEvent = { event: string; data: unknown };

/**
 * Wrap an async generator of SSE events into a Response.
 * Used by /api/ask and /api/reanalyze.
 */
export function sseResponse(
  generator: () => AsyncGenerator<SseEvent, void, unknown>,
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        for await (const evt of generator()) {
          const payload = `event: ${evt.event}\ndata: ${JSON.stringify(evt.data)}\n\n`;
          controller.enqueue(enc.encode(payload));
        }
      } catch (err) {
        const payload = `event: error\ndata: ${JSON.stringify({ message: String(err) })}\n\n`;
        controller.enqueue(new TextEncoder().encode(payload));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
