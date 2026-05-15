# iOS Shortcut Setup — QNB SMS Capture

This Shortcut runs automatically the moment a QNB transaction SMS arrives and
posts the message body to your dashboard's `/api/ingest` endpoint. Your iPhone
is the only thing that ever reads your SMS — Apple does not let any app read
messages directly, so an Automation is the trick.

## Requirements

- iOS 17 or newer.
- Shortcuts app installed (it ships with iOS).
- Your dashboard deployed (Vercel) with `INGEST_TOKEN` and `INGEST_USER_ID` set.
- Your ingest URL: `https://YOUR-APP.vercel.app/api/ingest`.

## Steps

1. Open **Shortcuts → Automation → ➕ New Automation → Message**.
2. **Sender:** Choose contact / number `QNB` (or whatever shortcode QNB sends
   from in your area — long-press a recent QNB SMS to confirm).
3. **Message contains:** `تمت عملية شراء`
4. Toggle **Run Immediately: ON** (no confirmation needed).
   Toggle **Notify When Run: OFF** (optional — leave on if you want a banner).
5. Tap **Next**, then **New Blank Automation**.
6. Add these actions, in order:

### Action 1 — Dictionary

- Type: **Dictionary**
- Keys:
  - `smsText` → Magic Variable → **Shortcut Input** (the message body)
  - `receivedAt` → Magic Variable → **Current Date** → Format **ISO 8601**
  - `source` → `qnb`

### Action 2 — Get Contents of URL

- URL: `https://YOUR-APP.vercel.app/api/ingest`
- Method: **POST**
- Headers:
  - `Authorization: Bearer YOUR_INGEST_TOKEN`
  - `Content-Type: application/json`
- Request Body: **JSON** → use the Dictionary from Action 1.

### Action 3 — Show Notification (optional)

- Title: `Logged`
- Body: combine `merchant` and `category` from the URL response (use **Get
  Dictionary Value** to extract).

### Action 4 — Fallback (optional but recommended)

Wrap Action 2 with an **If** that checks `Contents of URL` for HTTP failure.
In the else branch:

- **Append to Note** — Note name `QNB Failed SMS`. Append the raw text + the
  current date. You can re-send these later via curl or a sync shortcut.

## Privacy note

Your SMS body is sent only to your own backend (the URL you control). The
backend forwards just the **merchant name** to the Anthropic API for
categorization — never the amount, balance, or card number.

## Troubleshooting

- **Nothing fires** → Re-open the Automation, confirm "Run Immediately" is
  on. Re-add the contact filter (sender match is finicky if QNB changes its
  shortcode).
- **HTTP 401** → Your `Authorization: Bearer …` header doesn't match
  `INGEST_TOKEN` in your deployment. Update one or the other.
- **HTTP 422 / `not_a_qnb_transaction`** → The parser couldn't extract a
  required field. Tap into the failed entry on the dashboard's `QNB Failed
  SMS` note and open an issue with the message body (with personal data
  redacted).
- **Arabic encoding** → make sure the request body is sent as **JSON**, not
  form data. JSON guarantees UTF-8.
