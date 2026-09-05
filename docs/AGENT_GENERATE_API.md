# Agent generate API contract (frontend-facing)

The GitHub Pages app builds evidence in the browser and calls a **thin generate** endpoint.

React does not know about AWS, Lambda, Terraform, or specific model vendors — only this contract.

Development uses the local bridge (`npm run agent:bridge` / `npm run start:ai`). Production GitHub Pages sets `REACT_APP_AGENT_GENERATE_URL` to the public jq404 API base (no secrets in the frontend). Backend ownership lives in `jigshare/infra/jq404/`.

## Conceptual shape

```json
{
  "query": "...",
  "evidence": [],
  "conversationContext": []
}
```

```json
{
  "answer": "...",
  "evidenceIds": [],
  "answerability": "strong",
  "inferenceUsed": false,
  "suggestedAction": null
}
```

In the wire format below, structured evidence is sent as `evidencePack` (not a bare array), and `conversationContext` is an object (history + focus + uiContext).

## Endpoint

`POST {GENERATE_BASE}/generate`

Optional: `GET {GENERATE_BASE}/health`

- Dev: CRA proxies `/api/agent` → local bridge.
- Prod (optional): public `REACT_APP_AGENT_GENERATE_URL` (no secrets in `REACT_APP_*`).

## Request

### Required

| Field | Type | Notes |
|-------|------|--------|
| `query` | string | Recruiter question, ≤800 chars |

### Optional but expected for grounded answers

| Field | Type | Notes |
|-------|------|--------|
| `evidencePack` | object | Browser-built pack (see below). Conceptual “evidence” array lives at `evidencePack.evidence`. |
| `conversationContext` | object | Multi-turn + UI focus (see below). |

```json
{
  "query": "string (required, ≤800 chars)",
  "evidencePack": {
    "query": "string",
    "confidence": "strong|moderate|weak|unsupported|none",
    "confidenceReason": "string",
    "intentHints": ["string"],
    "evidence": [
      {
        "key": "research:cadastrar",
        "id": "cadastrar",
        "type": "research",
        "title": "string",
        "route": "/#/r/cadastrar",
        "claimStrength": "direct|strongly_supported|reasonably_inferred|null",
        "role": "primary|expanded",
        "score": 0.0,
        "snippet": "string (≤1200 chars)"
      }
    ],
    "suggestedViews": [
      {
        "recordId": "cadastrar",
        "recordKey": "research:cadastrar",
        "route": "/#/r/cadastrar",
        "reason": "string"
      }
    ]
  },
  "conversationContext": {
    "history": [{ "role": "user|assistant", "content": "string (≤600 chars)" }],
    "focus": {
      "id": "string",
      "key": "string",
      "title": "string",
      "route": "string|null",
      "type": "string"
    },
    "uiContext": {
      "pathname": "string",
      "viewType": "string",
      "recordId": "string|null",
      "hashRoute": "string"
    },
    "retrievalQuery": "string"
  }
}
```

### Limits (enforced by bridge / future backend)

| Limit | Value |
|-------|-------|
| Body | ≤ 48 KB |
| Evidence items | ≤ 10 |
| Evidence text total | ≤ 8 000 chars |
| History turns | ≤ 8 |

### Forbidden client fields

`system`, `messages`, `prompt`, `provider`, `model`, `apiKey`, `temperature`, `maxTokens`

Authoritative grounding policy is **server-owned**.

## Success response

### Required

| Field | Type |
|-------|------|
| `answer` | string |
| `evidenceIds` | string[] (subset of supplied evidence keys) |
| `answerability` | `strong` \| `moderate` \| `weak` \| `unsupported` |
| `inferenceUsed` | boolean |

### Optional

| Field | Type |
|-------|------|
| `suggestedAction` | `{ recordId, route, reason }` or `null` |
| `meta` | provider/latency/cost (ops only; UI does not require it) |

Wire envelope used by the local bridge:

```json
{
  "ok": true,
  "result": {
    "answer": "string",
    "evidenceIds": ["research:cadastrar"],
    "answerability": "strong|moderate|weak|unsupported",
    "inferenceUsed": false,
    "suggestedAction": {
      "recordId": "cadastrar",
      "route": "/#/r/cadastrar",
      "reason": "string"
    },
    "meta": {
      "provider": "string",
      "model": "string",
      "latencyMs": 0,
      "inputTokens": 0,
      "outputTokens": 0,
      "costUsd": 0,
      "failoverUsed": false
    }
  }
}
```

`suggestedAction` is a hint; the React app validates tools against known IDs/routes before navigating.

## Error format

```json
{
  "ok": false,
  "error": { "code": "string", "message": "string" }
}
```

Common codes: `forbidden_field`, `payload_too_large`, `missing_query`, `rate_limited`, `timeout`, `provider_error`.

HTTP: `400` validation, `413` too large, `429` rate limit, `502` upstream model, `504` / abort timeout.

The UI maps transport failures to recruiter-safe copy and never shows raw parser/stack dumps.

## Timeouts

| Layer | Expectation |
|-------|-------------|
| Frontend abort | ~60–90s (`REACT_APP_AGENT_TIMEOUT_MS`) |
| Backend target | respond within ~25–30s |

## Streaming compatibility (optional)

Normalized agent events (retrieval is local; answer comes from generate):

- `session.started`
- `retrieval.started` / `retrieval.completed` (browser)
- `answer.delta` / `tool.requested` / `answer.completed`
- `error`

Token streaming from generate is **optional**. Do not fake streaming in the UI. A non-streaming JSON response is fully supported.

## Health

```json
{ "ok": true, "service": "agent-generate" }
```

The UI only needs `ok: true`.

## Out of scope for this frontend repo

AWS, SAM, Lambda, API Gateway, Secrets Manager, Terraform, and provider secrets belong in the separate backend stack (`jigshare/infra/jq404/`). This frontend only consumes the HTTP contract above.
