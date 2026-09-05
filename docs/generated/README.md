# Generated KB artifacts (dry run)

Outputs of:

- `npm run kb:normalize` — normalized preview / report / summary
- `npm run kb:retrieve:sync` — local retrieval index + sync report
- `npm run kb:retrieve:eval` — keyword retrieval evaluation (includes failure taxonomy)

Canonical inputs now also include:

- `public/assets/credentials.json`
- `public/assets/capabilities.json`

Bake-off / embeddings / evidence / LLM:

- `npm run kb:bakeoff` — semantic vs keyword report
- `npm run kb:evidence -- "…"` — grounded evidence pack for a question
- `npm run kb:evidence:eval` — unsupported + recruiter pack evaluation
- `npm run llm:bakeoff` — multi-provider grounded answer bake-off
- `npm run llm:answer -- "…"` — single grounded answer via configured provider
- `npm run agent:chat` — multi-turn agent session CLI (tools + focus)
- `npm run agent:chat -- --script scripts/fixtures/agent_demo_turns.json`
- `docs/generated/embeddings/` — experimental embedding caches (gitignored)

Configure LLM providers via `.env` (see `.env.example`). Never commit API keys.

These generated files are **not** part of the production website build (`public/` site pages / CRA `build/`). They are gitignored (except this README).

See `docs/AI_KB_NORMALIZER_SPEC.md`.
