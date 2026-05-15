/**
 * Bulk-backfill historical QNB SMS messages into the dashboard.
 *
 * Usage:
 *   INGEST_URL=https://your-app.vercel.app \
 *   INGEST_TOKEN=... \
 *   npx tsx scripts/backfill.ts qnb-messages.json
 *
 * Input file format: JSON array of:
 *   [{ "text": "<arabic sms>", "receivedAt": "2025-05-15 13:21:00" }, …]
 *
 * The /api/ingest endpoint dedupes by sha256(smsText) so this script is
 * SAFE TO RE-RUN. Already-imported messages return { deduped: true } and
 * count toward the "deduped" total below.
 *
 * Tunable env vars:
 *   CONCURRENCY  — parallel requests (default 4)
 *   DRY_RUN=1    — parse only, don't POST
 */

import { readFileSync } from "node:fs";

type Msg = { text: string; receivedAt: string };

const file = process.argv[2];
if (!file) {
  console.error("Usage: tsx scripts/backfill.ts <messages.json>");
  process.exit(1);
}

const url = process.env.INGEST_URL;
const token = process.env.INGEST_TOKEN;
const concurrency = Number(process.env.CONCURRENCY ?? 4);
const dryRun = process.env.DRY_RUN === "1";

if (!dryRun) {
  if (!url) throw new Error("INGEST_URL is required (e.g. https://your-app.vercel.app)");
  if (!token) throw new Error("INGEST_TOKEN is required");
}

const raw = readFileSync(file, "utf8");
const messages: Msg[] = JSON.parse(raw);

console.log(`Loaded ${messages.length} messages from ${file}`);
if (dryRun) {
  console.log("DRY_RUN=1 — exiting without POSTing.");
  console.log("Sample:", JSON.stringify(messages[0], null, 2));
  process.exit(0);
}

const stats = { ok: 0, deduped: 0, ignored: 0, error: 0 };
let done = 0;
const errors: Array<{ i: number; reason: string }> = [];

function toIso(s: string): string {
  // Convert "YYYY-MM-DD HH:MM:SS" → ISO-8601 with Z. Assume input is UTC.
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(s)) return s.replace(" ", "T") + "Z";
  return s;
}

async function send(m: Msg, i: number): Promise<void> {
  try {
    const res = await fetch(`${url}/api/ingest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        smsText: m.text,
        receivedAt: toIso(m.receivedAt),
        source: "qnb",
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      stats.error++;
      errors.push({ i, reason: `HTTP ${res.status}: ${JSON.stringify(body)}` });
    } else if (body.deduped) {
      stats.deduped++;
    } else if (body.status === "ignored") {
      stats.ignored++;
    } else {
      stats.ok++;
    }
  } catch (err) {
    stats.error++;
    errors.push({ i, reason: String(err) });
  } finally {
    done++;
    if (done % 25 === 0 || done === messages.length) {
      process.stdout.write(
        `\r[${done}/${messages.length}] ok=${stats.ok} deduped=${stats.deduped} ignored=${stats.ignored} err=${stats.error}    `,
      );
    }
  }
}

async function run() {
  // Simple worker pool.
  let cursor = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (cursor < messages.length) {
      const i = cursor++;
      await send(messages[i], i);
    }
  });
  await Promise.all(workers);
  console.log("\n\nDone.");
  console.log(`  inserted : ${stats.ok}`);
  console.log(`  deduped  : ${stats.deduped}`);
  console.log(`  ignored  : ${stats.ignored}  (non-purchase messages, expected)`);
  console.log(`  errors   : ${stats.error}`);
  if (errors.length > 0) {
    console.log("\nFirst 5 errors:");
    for (const e of errors.slice(0, 5)) console.log(`  #${e.i}: ${e.reason}`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
