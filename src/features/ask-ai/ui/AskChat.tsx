"use client";

import { useEffect, useRef, useState } from "react";
import { Suggestions } from "./Suggestions";

type ToolCall = { name: string; input: Record<string, unknown> };

type Turn = {
  role: "user" | "assistant";
  content: string;
  tools?: ToolCall[];
  streaming?: boolean;
};

export function AskChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  async function send(text: string) {
    if (!text.trim() || running) return;
    setError(null);
    setInput("");

    const nextTurns: Turn[] = [
      ...turns,
      { role: "user", content: text.trim() },
      { role: "assistant", content: "", tools: [], streaming: true },
    ];
    setTurns(nextTurns);
    setRunning(true);

    const history = nextTurns
      .slice(0, -1) // drop the streaming placeholder
      .map((t) => ({ role: t.role, content: t.content }));

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => res.statusText);
        throw new Error(detail || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const frames = buf.split("\n\n");
        buf = frames.pop() ?? "";
        for (const frame of frames) {
          const eventLine = frame.split("\n").find((l) => l.startsWith("event: "));
          const dataLine = frame.split("\n").find((l) => l.startsWith("data: "));
          if (!eventLine || !dataLine) continue;
          const eventName = eventLine.slice(7);
          const payload = JSON.parse(dataLine.slice(6));

          setTurns((cur) => {
            const copy = [...cur];
            const last = copy[copy.length - 1];
            if (last.role !== "assistant") return copy;
            if (eventName === "delta") {
              last.content += (payload as { text: string }).text;
            } else if (eventName === "tool_use") {
              last.tools = [...(last.tools ?? []), payload as ToolCall];
            } else if (eventName === "done") {
              last.streaming = false;
            } else if (eventName === "error") {
              last.streaming = false;
              setError((payload as { message?: string }).message ?? "unknown error");
            }
            return copy;
          });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setTurns((cur) => {
        const copy = [...cur];
        const last = copy[copy.length - 1];
        if (last?.role === "assistant") last.streaming = false;
        return copy;
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-180px)] flex-col md:h-[calc(100vh-220px)]">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pr-1">
        {turns.length === 0 && (
          <div className="space-y-6 py-6">
            <div>
              <div className="font-display text-[24px] font-semibold tracking-display text-ink">
                Ask anything
              </div>
              <p className="mt-1 text-[14px] text-ink-muted">
                Natural-language search across your spend. Try one of these:
              </p>
            </div>
            <Suggestions onPick={send} />
          </div>
        )}

        {turns.map((t, i) => (
          <Bubble key={i} turn={t} />
        ))}

        {error && (
          <div className="rounded-xl bg-danger/15 px-3 py-2 text-[13px] text-danger">{error}</div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-4 flex items-center gap-2 rounded-2xl bg-bg-card p-2 ring-1 ring-line"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={running}
          placeholder={running ? "Thinking…" : "Ask anything about your spend"}
          className="flex-1 bg-transparent px-3 py-2 text-[15px] text-ink placeholder:text-ink-dim focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={running || !input.trim()}
          className="rounded-full bg-accent px-4 py-2 text-[13px] font-medium text-white disabled:opacity-40"
        >
          {running ? "…" : "Ask"}
        </button>
      </form>
    </div>
  );
}

function Bubble({ turn }: { turn: Turn }) {
  if (turn.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-accent px-4 py-2 text-[14px] text-white">
          {turn.content}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="glass rounded-2xl p-4 text-[14px] leading-relaxed text-ink">
        {turn.content ? (
          <Markdown text={turn.content} />
        ) : (
          <span className="text-ink-muted">{turn.streaming ? "Thinking…" : ""}</span>
        )}
      </div>
      {turn.tools && turn.tools.length > 0 && (
        <details className="px-1">
          <summary className="cursor-pointer text-[11px] text-ink-dim hover:text-ink-muted">
            {turn.tools.length} tool call{turn.tools.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-1.5 space-y-1 font-mono text-[11px] text-ink-muted">
            {turn.tools.map((t, i) => (
              <li key={i} className="truncate">
                <span className="text-accent">{t.name}</span>(
                {Object.entries(t.input).map(([k, v], j, arr) => (
                  <span key={k}>
                    {k}={JSON.stringify(v)}
                    {j < arr.length - 1 ? ", " : ""}
                  </span>
                ))}
                )
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// Minimal markdown: paragraphs, **bold**, lists (•), code (`) — enough for Claude's typical output.
function Markdown({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter(Boolean);
        const isList = lines.every((l) => /^[-*•]\s/.test(l));
        if (isList) {
          return (
            <ul key={i} className="ml-4 list-disc space-y-1">
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.replace(/^[-*•]\s/, ""))}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{renderInline(block)}</p>;
      })}
    </div>
  );
}

function renderInline(line: string): React.ReactNode {
  // **bold** and `code`
  const parts: React.ReactNode[] = [];
  let i = 0;
  const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m.index > i) parts.push(line.slice(i, m.index));
    if (m[1]) parts.push(<strong key={m.index}>{m[1]}</strong>);
    else if (m[2])
      parts.push(
        <code key={m.index} className="rounded bg-bg-elev px-1 py-0.5 text-[12px] text-accent">
          {m[2]}
        </code>,
      );
    i = m.index + m[0].length;
  }
  if (i < line.length) parts.push(line.slice(i));
  return parts;
}
