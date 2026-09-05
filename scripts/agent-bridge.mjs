#!/usr/bin/env node
/**
 * Dev bridge (TODO 11/12).
 *
 *   GET  /api/agent/health
 *   POST /api/agent/generate   — thin LLM gateway (browser does retrieval)
 *   POST /api/agent/message    — legacy full server agent (optional)
 *
 * Never deploy to GitHub Pages.
 */
import http from 'node:http';
import { loadEnvFile } from './lib/load-env.mjs';
import { createEvidencePipeline } from './lib/kb-pipeline.mjs';
import { createAgentRuntime } from './lib/kb-agent.mjs';
import {
  createModelAdapter,
  generateGroundedAnswer,
  emptyGroundedAnswer,
} from './lib/kb-llm.mjs';
import { validateGenerateRequest, LIMITS } from './lib/agent-generate-validate.mjs';

loadEnvFile();

const PORT = Number(process.env.AGENT_BRIDGE_PORT || 8787);
const HOST = process.env.AGENT_BRIDGE_HOST || '127.0.0.1';

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({ raw: '', body: {} });
      try {
        resolve({ raw, body: JSON.parse(raw) });
      } catch (err) {
        reject(new Error(`Invalid JSON body: ${err.message}`));
      }
    });
    req.on('error', reject);
  });
}

function wantsSse(req) {
  return String(req.headers.accept || '').includes('text/event-stream');
}

function isFailoverWorthy(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return /timeout|timed out|rate.?limit|429|500|502|503|504|econnreset|enotfound|network|fetch failed|http 5|provider/i.test(
    msg
  );
}

function publicResult(result) {
  const pack = result.evidencePack;
  return {
    sessionId: result.sessionId,
    answer: result.answer,
    evidenceIds: result.evidenceIds || [],
    answerability: result.answerability,
    inferenceUsed: !!result.inferenceUsed,
    suggestedAction: result.suggestedAction || null,
    toolCall: result.toolCall || null,
    toolRejected: result.toolRejected || null,
    evidencePack: pack
      ? {
          confidence: pack.confidence,
          confidenceReason: pack.confidenceReason,
          routes: pack.routes || [],
          suggestedViews: pack.suggestedViews || [],
          evidence: (pack.evidence || []).map((e) => ({
            key: e.key,
            id: e.id,
            type: e.type,
            title: e.title,
            route: e.route,
            role: e.role,
            score: e.score,
          })),
        }
      : null,
    provider: result.provider,
    model: result.model,
    meta: {
      latencyMs: result.meta?.latencyMs,
      failoverUsed: !!result.meta?.failoverUsed,
      skippedLlm: !!result.meta?.skippedLlm,
      retrievalQuery: result.meta?.retrievalQuery || null,
    },
    events: (result.events || []).map((e) => ({
      type: e.type,
      ts: e.ts,
      sessionId: e.sessionId,
      query: e.query,
      confidence: e.confidence,
      evidenceCount: e.evidenceCount,
      text: e.text,
      toolCall: e.toolCall,
      answerability: e.answerability,
      error: e.error,
    })),
    session: result.session
      ? {
          id: result.session.id,
          focus: result.session.focus,
          historyLength: (result.session.history || []).length,
        }
      : null,
    error: result.error || null,
  };
}

function createAdapters() {
  let primary;
  try {
    primary = createModelAdapter(
      process.env.AI_PROVIDER || 'local',
      process.env.AI_MODEL || 'grounded_composer'
    );
  } catch {
    primary = createModelAdapter('local', 'grounded_composer');
  }
  let fallback = null;
  if (process.env.AI_FALLBACK_PROVIDER) {
    try {
      fallback = createModelAdapter(
        process.env.AI_FALLBACK_PROVIDER,
        process.env.AI_FALLBACK_MODEL || process.env.AI_MODEL
      );
    } catch {
      fallback = null;
    }
  }
  return { primary, fallback };
}

async function main() {
  const { primary, fallback } = createAdapters();
  let agent = null;
  let agentLoading = null;

  async function getAgent() {
    if (agent) return agent;
    if (!agentLoading) {
      agentLoading = (async () => {
        console.log('[agent-bridge] Lazy-loading full evidence pipeline for /message…');
        const pipeline = await createEvidencePipeline();
        agent = createAgentRuntime(pipeline);
        console.log('[agent-bridge] Full agent ready');
        return agent;
      })();
    }
    return agentLoading;
  }

  console.log(
    `[agent-bridge] Generate adapter ${primary.id}` +
      (fallback ? ` · fallback ${fallback.id}` : '')
  );

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);

    try {
      if (req.method === 'GET' && url.pathname === '/api/agent/health') {
        sendJson(res, 200, {
          ok: true,
          devOnly: true,
          mode: 'generate+legacy',
          adapter: primary.id,
          fallback: fallback?.id || null,
          limits: LIMITS,
        });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/agent/generate') {
        const { raw, body } = await readBody(req);
        const validated = validateGenerateRequest(body, Buffer.byteLength(raw || ''));
        if (!validated.ok) {
          sendJson(res, validated.status, { ok: false, error: validated.error });
          return;
        }

        let adapter = primary;
        let failoverUsed = false;
        let gen;
        try {
          gen = await generateGroundedAnswer(validated.value, primary);
        } catch (err) {
          if (fallback && isFailoverWorthy(err)) {
            failoverUsed = true;
            adapter = fallback;
            gen = await generateGroundedAnswer(validated.value, fallback);
          } else {
            throw err;
          }
        }
        const answer = gen.answer || emptyGroundedAnswer();
        sendJson(res, 200, {
          ok: true,
          result: {
            answer: answer.answer,
            evidenceIds: answer.evidenceIds,
            answerability: answer.answerability,
            inferenceUsed: answer.inferenceUsed,
            suggestedAction: answer.suggestedAction,
            meta: {
              provider: adapter.provider,
              model: adapter.model,
              latencyMs: gen.meta?.latencyMs,
              inputTokens: gen.meta?.inputTokens,
              outputTokens: gen.meta?.outputTokens,
              costUsd: gen.meta?.costUsd,
              failoverUsed,
            },
          },
        });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/agent/message') {
        const runtime = await getAgent();
        const { body } = await readBody(req);
        const message = String(body.message || '').trim();
        if (!message) {
          sendJson(res, 400, { ok: false, error: { message: 'message is required' } });
          return;
        }

        if (wantsSse(req) || body.stream === true) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-store',
            Connection: 'keep-alive',
          });
          const writeEvent = (payload) => {
            res.write(`data: ${JSON.stringify(payload)}\n\n`);
          };
          try {
            const result = await runtime.handleMessage({
              sessionId: body.sessionId,
              message,
              uiContext: body.uiContext || null,
              conversationHistory: body.conversationHistory,
              onEvent: (ev) => writeEvent(ev),
            });
            writeEvent({ type: 'result', result: publicResult(result) });
          } catch (err) {
            writeEvent({ type: 'error', error: { message: err.message || String(err) } });
          }
          res.end();
          return;
        }

        const result = await runtime.handleMessage({
          sessionId: body.sessionId,
          message,
          uiContext: body.uiContext || null,
          conversationHistory: body.conversationHistory,
        });
        sendJson(res, 200, { ok: true, result: publicResult(result) });
        return;
      }

      sendJson(res, 404, { ok: false, error: { message: 'Not found' } });
    } catch (err) {
      console.error('[agent-bridge]', err);
      sendJson(res, 500, { ok: false, error: { message: err.message || String(err) } });
    }
  });

  server.listen(PORT, HOST, () => {
    console.log(`[agent-bridge] Listening on http://${HOST}:${PORT}`);
    console.log('[agent-bridge] POST /api/agent/generate (split) · POST /api/agent/message (legacy)');
  });
}

main().catch((err) => {
  console.error('[agent-bridge] FAILED', err);
  process.exit(1);
});
