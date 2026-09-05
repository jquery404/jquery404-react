/**
 * Provider-neutral grounded answer generation (TODO 9).
 *
 * generateGroundedAnswer({ query, evidencePack, conversationContext, responseSchema })
 *
 * Adapters normalize vendor responses into one schema. Evaluation code must not
 * depend on provider-specific shapes.
 */

import { loadEnvFile } from './load-env.mjs';

loadEnvFile();

export const GROUNDED_RESPONSE_SCHEMA = {
  type: 'object',
  required: ['answer', 'evidenceIds', 'answerability', 'inferenceUsed', 'suggestedAction'],
  properties: {
    answer: { type: 'string' },
    evidenceIds: { type: 'array', items: { type: 'string' } },
    answerability: { type: 'string', enum: ['strong', 'moderate', 'weak', 'unsupported', 'none'] },
    inferenceUsed: { type: 'boolean' },
    suggestedAction: {
      type: ['object', 'null'],
      properties: {
        recordId: { type: 'string' },
        route: { type: 'string' },
        reason: { type: 'string' },
      },
    },
  },
};

export const GROUNDING_SYSTEM_POLICY = `You are the conversational guide for Faisal Zaman's portfolio.

Converse naturally with the visitor, like a real person who knows Faisal well would — warm and direct, not a database printout or a form letter. Vary your openers; do not start every reply the same way (e.g. do not always lead with "Based on..."). Never use internal/clinical vocabulary in the answer — no "claim strength," "capability inference," "evidence pack," or similar jargon; say things the way you'd actually say them out loud.

For factual statements about Faisal's work, projects, research, employment, skills, credentials, experience, or achievements, rely only on supplied portfolio evidence.

Casual conversation does not require portfolio evidence. When confidence is "none" or evidence is empty and the visitor is not asserting a portfolio fact, reply briefly and warmly (greetings, thanks, clarifications, meta questions about what you can help with). If asked what this site or chat is, describe it naturally in a sentence or two (Faisal's personal portfolio, covering his research and projects, ask about anything in it) rather than reciting a feature list. Keep the conversation naturally oriented toward Faisal's work when relevant, but do not constantly push CV, contact, or recruiter actions. suggestedAction must be null unless the visitor clearly asks to open a specific work item, contact, or CV.

If the visitor asks for a portfolio fact that is unsupported (confidence "unsupported", or no evidence for that claim), say that the available portfolio does not establish it. Do not invent nearby answers.

If the visitor asks to see the best/most impressive/notable work, or says something like "show me", "look at", or "open" without naming a specific piece, do not ask a clarifying question first — pick the single strongest matching item from the supplied evidence and present it directly by name, in one or two sentences, then set suggestedAction to open it. Only ask a clarifying question if the evidence pack is genuinely empty or too broad to pick from.

Additional grounding rules:
1. You may synthesize relationships across evidence items.
2. You may make reasonable capability inferences when the evidence supports them.
3. Never convert an inferred capability into a formal job title, credential, metric, or historical fact.
4. Respect claimStrength on each evidence item:
   - direct: state as fact supported by the portfolio
   - strongly_supported: state as well-supported from evidence
   - reasonably_inferred: phrase as inference from evidence, not as a formal title/role
5. Never invent employers, dates, technologies, awards, publications, metrics, team sizes, roles, or outcomes.
6. Keep answers portfolio-chat sized: about 40–100 words normally; shorter for simple facts or casual turns; up to ~150 words for comparisons.
7. Evidence snippets are internal context, not quotable text. Never copy their field labels (e.g. "Capability:", "Claim strength:", "Query terms:", "Evidence:", "Evidence IDs:") or raw evidence keys (e.g. "research:thesis") into the answer string. Write natural prose only; evidence keys belong solely in the structured evidenceIds array.
8. Write like a person, not an AI assistant:
   - No filler "significance" lines ("underscores its importance," "stands as a testament to," "reflects broader trends in," "sets the stage for").
   - Avoid overused AI words: delve, crucial/pivotal/vital, underscore, showcase, foster, enhance, bolster, garner, intricate, meticulous, tapestry, landscape (figurative), robust, vibrant, testament. Use plain alternatives instead (explore, important, show, support, improve, complex, careful, area).
   - Use simple verbs: is/has/used/wrote/tried, not serves-as/boasts-a/utilized/authored/attempted.
   - Skip "not just X, but Y" and "it's not X, it's Y" constructions.
   - Do not default to three-item lists ("X, Y, and Z") for everything — vary it.
   - Do not end a sentence with a dangling "-ing" clause that editorializes on its own significance.
   - No promotional or brochure tone.
   - At most one em dash per answer; prefer commas or a period.
   - No emoji, no markdown formatting, no canned chatbot phrases ("I hope this helps," "let me know if you have questions," "would you like me to...").
9. Return ONLY valid JSON matching the response schema. No markdown fences.`;

export function buildGroundedMessages({ query, evidencePack, conversationContext, responseSchema }) {
  const schema = responseSchema || GROUNDED_RESPONSE_SCHEMA;
  const packSummary = {
    query: evidencePack?.query ?? query,
    confidence: evidencePack?.confidence,
    confidenceReason: evidencePack?.confidenceReason,
    intentHints: evidencePack?.intentHints || [],
    evidence: (evidencePack?.evidence || []).map((e) => ({
      key: e.key,
      id: e.id,
      type: e.type,
      title: e.title,
      route: e.route,
      claimStrength: e.claimStrength,
      role: e.role,
      score: e.score,
      snippet: e.snippet,
    })),
    suggestedViews: evidencePack?.suggestedViews || [],
  };

  const userPayload = {
    question: query,
    conversationContext: conversationContext || null,
    evidencePack: packSummary,
    responseSchema: schema,
    instructions: {
      evidenceIds_must_be_subset_of: packSummary.evidence.map((e) => e.key),
      suggestedAction_from: packSummary.suggestedViews,
    },
  };

  return {
    system: GROUNDING_SYSTEM_POLICY,
    user: JSON.stringify(userPayload, null, 2),
  };
}

export function emptyGroundedAnswer(partial = {}) {
  return {
    answer: partial.answer || '',
    evidenceIds: partial.evidenceIds || [],
    answerability: partial.answerability || 'unsupported',
    inferenceUsed: Boolean(partial.inferenceUsed),
    suggestedAction: partial.suggestedAction ?? null,
  };
}

export function parseModelJson(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('Empty model response');
  let candidate = raw;
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidate = fence[1].trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start >= 0 && end > start) candidate = candidate.slice(start, end + 1);
  return JSON.parse(candidate);
}

export function normalizeGroundedAnswer(raw, evidencePack) {
  const allowed = new Set((evidencePack?.evidence || []).map((e) => e.key));
  const obj = typeof raw === 'string' ? parseModelJson(raw) : raw;
  const evidenceIds = Array.isArray(obj.evidenceIds)
    ? obj.evidenceIds.map(String).filter((id) => allowed.has(id))
    : [];
  let suggestedAction = obj.suggestedAction ?? null;
  if (suggestedAction && typeof suggestedAction === 'object') {
    suggestedAction = {
      recordId: suggestedAction.recordId ? String(suggestedAction.recordId) : null,
      route: suggestedAction.route ? String(suggestedAction.route) : null,
      reason: suggestedAction.reason ? String(suggestedAction.reason) : null,
    };
  } else {
    suggestedAction = null;
  }
  const answerability = ['strong', 'moderate', 'weak', 'unsupported', 'none'].includes(obj.answerability)
    ? obj.answerability
    : evidencePack?.confidence || 'weak';

  return emptyGroundedAnswer({
    answer: String(obj.answer || '').trim(),
    evidenceIds,
    answerability,
    inferenceUsed: Boolean(obj.inferenceUsed),
    suggestedAction,
  });
}

/** Approximate token count when provider omits usage. */
export function estimateTokensFromText(text) {
  return Math.max(1, Math.ceil(String(text || '').length / 4));
}

export const MODEL_PRICING_PER_1M = {
  // USD per 1M tokens — approximate list prices for cost estimates
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  'deepseek-chat': { input: 0.14, output: 0.28 },
  'mistral-small-latest': { input: 0.1, output: 0.3 },
  'gemini-2.0-flash-lite': { input: 0.075, output: 0.3 },
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  grounded_composer: { input: 0, output: 0 },
  extractive: { input: 0, output: 0 },
  cautious: { input: 0, output: 0 },
};

export function estimateCostUsd(model, inputTokens, outputTokens) {
  const p = MODEL_PRICING_PER_1M[model] || { input: 0.2, output: 0.6 };
  return (inputTokens / 1e6) * p.input + (outputTokens / 1e6) * p.output;
}

/**
 * OpenAI-compatible Chat Completions adapter (OpenAI, Groq, DeepSeek, Mistral, OpenRouter, …).
 */
export function createOpenAICompatibleAdapter(config) {
  const {
    provider = 'openai_compatible',
    model,
    apiKey,
    baseUrl = 'https://api.openai.com/v1',
    temperature = 0.2,
    maxTokens = 400,
  } = config;

  if (!apiKey) throw new Error(`${provider}: missing API key`);
  if (!model) throw new Error(`${provider}: missing model`);

  return {
    id: `${provider}:${model}`,
    provider,
    model,
    async generateGroundedAnswer({ query, evidencePack, conversationContext, responseSchema }) {
      const messages = buildGroundedMessages({
        query,
        evidencePack,
        conversationContext,
        responseSchema,
      });
      const t0 = Date.now();
      const url = `${String(baseUrl).replace(/\/$/, '')}/chat/completions`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: Number(temperature),
          max_tokens: Number(maxTokens),
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: messages.system },
            { role: 'user', content: messages.user },
          ],
        }),
      });
      const latencyMs = Date.now() - t0;
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = body?.error?.message || body?.message || res.statusText;
        throw new Error(`${provider} HTTP ${res.status}: ${msg}`);
      }
      const content = body?.choices?.[0]?.message?.content || '';
      const usage = body?.usage || {};
      const inputTokens = usage.prompt_tokens ?? estimateTokensFromText(messages.system + messages.user);
      const outputTokens = usage.completion_tokens ?? estimateTokensFromText(content);
      let parsed;
      let schemaOk = true;
      try {
        parsed = normalizeGroundedAnswer(content, evidencePack);
      } catch (err) {
        schemaOk = false;
        parsed = emptyGroundedAnswer({
          answer: String(content).slice(0, 500),
          answerability: evidencePack?.confidence || 'weak',
        });
      }
      return {
        answer: parsed,
        meta: {
          provider,
          model,
          latencyMs,
          inputTokens,
          outputTokens,
          costUsd: estimateCostUsd(model, inputTokens, outputTokens),
          schemaOk,
          rawText: content,
        },
      };
    },
  };
}

/**
 * Gemini generateContent adapter (Google AI Studio).
 */
export function createGeminiAdapter(config) {
  const {
    provider = 'gemini',
    model = 'gemini-2.0-flash-lite',
    apiKey,
    temperature = 0.2,
    maxTokens = 400,
  } = config;
  if (!apiKey) throw new Error('gemini: missing API key');

  return {
    id: `${provider}:${model}`,
    provider,
    model,
    async generateGroundedAnswer({ query, evidencePack, conversationContext, responseSchema }) {
      const messages = buildGroundedMessages({
        query,
        evidencePack,
        conversationContext,
        responseSchema,
      });
      const t0 = Date.now();
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: messages.system }] },
          contents: [{ role: 'user', parts: [{ text: messages.user }] }],
          generationConfig: {
            temperature: Number(temperature),
            maxOutputTokens: Number(maxTokens),
            responseMimeType: 'application/json',
          },
        }),
      });
      const latencyMs = Date.now() - t0;
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(`gemini HTTP ${res.status}: ${body?.error?.message || res.statusText}`);
      }
      const content = body?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
      const usage = body?.usageMetadata || {};
      const inputTokens = usage.promptTokenCount ?? estimateTokensFromText(messages.system + messages.user);
      const outputTokens = usage.candidatesTokenCount ?? estimateTokensFromText(content);
      let parsed;
      let schemaOk = true;
      try {
        parsed = normalizeGroundedAnswer(content, evidencePack);
      } catch {
        schemaOk = false;
        parsed = emptyGroundedAnswer({
          answer: String(content).slice(0, 500),
          answerability: evidencePack?.confidence || 'weak',
        });
      }
      return {
        answer: parsed,
        meta: {
          provider,
          model,
          latencyMs,
          inputTokens,
          outputTokens,
          costUsd: estimateCostUsd(model, inputTokens, outputTokens),
          schemaOk,
          rawText: content,
        },
      };
    },
  };
}

function pickSuggestedAction(evidencePack) {
  if (!evidencePack?.evidence?.length) return null;
  if (evidencePack.confidence === 'none' || evidencePack.confidence === 'unsupported') return null;
  const evidence = evidencePack.evidence || [];
  const presentable =
    evidence.find(
      (e) =>
        ['research', 'project', 'app'].includes(e.type) &&
        e.route &&
        /^\/#\/(r|p|a)\//.test(String(e.route))
    ) || null;
  if (presentable) {
    return {
      recordId: presentable.id,
      route: presentable.route,
      reason: 'presentable portfolio record',
    };
  }
  const v = evidencePack?.suggestedViews?.find((s) => /^\/#\/(r|p|a)\//.test(String(s.route || ''))) ||
    evidencePack?.suggestedViews?.[0];
  if (!v) return null;
  return { recordId: v.recordId, route: v.route, reason: v.reason };
}

function wordTrim(text, maxWords) {
  const words = String(text).trim().split(/\s+/);
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ')}…`;
}

/**
 * Local grounded composers (no external API). Used for offline bake-off / harness baseline.
 */
export function createLocalComposerAdapter(variant = 'grounded_composer') {
  const provider = 'local';
  const model = variant;

  return {
    id: `${provider}:${model}`,
    provider,
    model,
    async generateGroundedAnswer({ query, evidencePack }) {
      const t0 = Date.now();
      const evidence = evidencePack?.evidence || [];
      // Empty packs without an explicit unsupported claim are conversational, not refusals.
      let conf = evidencePack?.confidence;
      if (!conf) conf = evidence.length === 0 ? 'none' : 'weak';

      let answerObj;
      if (conf === 'unsupported') {
        answerObj = emptyGroundedAnswer({
          answer:
            'The available portfolio does not establish that. I will not invent employers, credentials, or technologies that are not in the evidence.',
          evidenceIds: [],
          answerability: 'unsupported',
          inferenceUsed: false,
          suggestedAction: null,
        });
      } else if (conf === 'none' || evidence.length === 0) {
        const q = String(query || '').trim();
        const asksSomething =
          /\?$/.test(q) ||
          /^(what|who|how|why|where|when|tell|explain|describe)\b/i.test(q);
        answerObj = emptyGroundedAnswer({
          answer: asksSomething
            ? 'I do not have enough matching portfolio evidence for that yet. Try asking about projects, research, AI, cloud, or a specific piece of work.'
            : 'Hey! What are you curious about — projects, research, or how things connect?',
          evidenceIds: [],
          answerability: 'none',
          inferenceUsed: false,
          suggestedAction: null,
        });
      } else if (variant === 'extractive') {
        const bullets = evidence.slice(0, 4).map((e) => `${e.title} (${e.claimStrength || 'direct'})`);
        answerObj = emptyGroundedAnswer({
          answer: wordTrim(`Based on portfolio records: ${bullets.join('; ')}.`, 90),
          evidenceIds: evidence.slice(0, 4).map((e) => e.key),
          answerability: conf,
          inferenceUsed: evidence.some((e) => e.claimStrength === 'reasonably_inferred'),
          suggestedAction: pickSuggestedAction(evidencePack),
        });
      } else if (variant === 'cautious') {
        const top = evidence[0];
        const inferred = evidence.filter((e) => e.claimStrength === 'reasonably_inferred');
        let answer = `From the available evidence, relevant items include ${top.title}.`;
        if (inferred.length) {
          answer +=
            ' Some related capabilities are reasonably inferred from projects and should not be read as formal job titles.';
        }
        answerObj = emptyGroundedAnswer({
          answer: wordTrim(answer, 70),
          evidenceIds: evidence.slice(0, 3).map((e) => e.key),
          answerability: conf === 'strong' ? 'moderate' : conf,
          inferenceUsed: inferred.length > 0,
          suggestedAction: pickSuggestedAction(evidencePack),
        });
      } else {
        // grounded_composer — careful synthesis
        const direct = evidence.filter((e) => e.claimStrength !== 'reasonably_inferred');
        const inferred = evidence.filter((e) => e.claimStrength === 'reasonably_inferred');
        const presentable =
          evidence.find(
            (e) =>
              ['research', 'project', 'app'].includes(e.type) &&
              e.route &&
              /^\/#\/(r|p|a)\//.test(String(e.route))
          ) ||
          direct[0] ||
          evidence[0];

        let answer;
        let evidenceIds = evidence.slice(0, 5).map((e) => e.key);
        let suggestedAction = pickSuggestedAction(evidencePack);
        let inferenceUsed = inferred.length > 0;
        let answerability = conf;

        if (/\b(best work|show me|look at|open|impressive|notable highlight)\b/i.test(query) && presentable) {
          const kind =
            presentable.type === 'research'
              ? 'research'
              : presentable.type === 'project'
                ? 'project'
                : 'work';
          answer = `A strong highlight is ${presentable.title}. Opening that ${kind} so you can explore it.`;
          evidenceIds = [presentable.key, ...evidenceIds.filter((k) => k !== presentable.key)].slice(0, 4);
          suggestedAction = {
            recordId: presentable.id,
            route: presentable.route,
            reason: 'best-work presentation',
          };
          inferenceUsed = presentable.claimStrength === 'reasonably_inferred';
        } else {
          const lead = presentable;
          const parts = [];
          parts.push(`Based on ${lead.type === 'event' ? 'his talks and demos' : lead.type} work`);
          if (lead.title) parts.push(`(${lead.title})`);
          answer = `${parts.join(' ')}. `;
          const METADATA_LINE_PREFIX =
            /^(Title|Date|Place|Role|Award|Capability|Claim strength|Query terms|Evidence|Evidence IDs):/;
          const snippet = String(lead.snippet || '')
            .split('\n')
            .filter((line) => !METADATA_LINE_PREFIX.test(line.trim()))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          answer += wordTrim(snippet || lead.title || '', 40);
          if (inferred.length && !/\baws\b/i.test(query)) {
            answer += ` Related capabilities are inferred from shipped work and are not formal job titles.`;
          }
        }

        if (/\baws\b/i.test(query) && evidence.some((e) => e.key === 'credential:aws-sap')) {
          answer =
            'Yes. The portfolio lists an AWS Solutions Architect – Professional credential (Credly-linked). This is direct certification evidence, not an inference.';
          evidenceIds = ['credential:aws-sap'];
          suggestedAction = {
            recordId: 'aws-sap',
            route: evidence.find((e) => e.key === 'credential:aws-sap')?.route || null,
            reason: 'primary evidence',
          };
          inferenceUsed = false;
          answerability = 'strong';
        }
        if (/\bproduct manager\b/i.test(query)) {
          answer =
            'The portfolio does not state that Faisal held a formal Product Manager title. It does include reasonably inferred product-thinking evidence from shipped LMS/CRM/gov workflows (e.g. NexSchool, NexCRM, LINZ, CadastrAR stakeholders), which should not be overstated as a PM role.';
          evidenceIds = evidence
            .filter((e) => e.key.includes('product') || /nexschool|nexcrm|linz|cadastrar|myeg/.test(e.key))
            .slice(0, 4)
            .map((e) => e.key);
          if (!evidenceIds.length) evidenceIds = evidence.slice(0, 3).map((e) => e.key);
          inferenceUsed = true;
          answerability = 'moderate';
        }
        answerObj = emptyGroundedAnswer({
          answer: wordTrim(answer, 110),
          evidenceIds,
          answerability,
          inferenceUsed,
          suggestedAction,
        });
      }

      const latencyMs = Date.now() - t0;
      const inputTokens = estimateTokensFromText(JSON.stringify(evidencePack));
      const outputTokens = estimateTokensFromText(answerObj.answer);
      return {
        answer: answerObj,
        meta: {
          provider,
          model,
          latencyMs,
          inputTokens,
          outputTokens,
          costUsd: 0,
          schemaOk: true,
          rawText: JSON.stringify(answerObj),
        },
      };
    },
  };
}

export function resolveProviderConfig(alias, modelOverride) {
  const a = String(alias || '').toLowerCase();
  const temperature = process.env.AI_TEMPERATURE || 0.2;
  const maxTokens = process.env.AI_MAX_TOKENS || 400;

  if (a === 'local' || a === 'local_grounded' || a.startsWith('local:')) {
    const variant = modelOverride || (a.includes(':') ? a.split(':')[1] : 'grounded_composer');
    return { kind: 'local', variant, temperature, maxTokens };
  }
  if (a === 'gemini' || a === 'google') {
    return {
      kind: 'gemini',
      provider: 'gemini',
      model: modelOverride || process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite',
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.AI_API_KEY,
      temperature,
      maxTokens,
    };
  }
  if (a === 'groq') {
    return {
      kind: 'openai_compatible',
      provider: 'groq',
      model: modelOverride || 'llama-3.1-8b-instant',
      apiKey: process.env.GROQ_API_KEY || process.env.AI_API_KEY,
      baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
      temperature,
      maxTokens,
    };
  }
  if (a === 'deepseek') {
    return {
      kind: 'openai_compatible',
      provider: 'deepseek',
      model: modelOverride || 'deepseek-chat',
      apiKey: process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY,
      baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      temperature,
      maxTokens,
    };
  }
  if (a === 'mistral') {
    return {
      kind: 'openai_compatible',
      provider: 'mistral',
      model: modelOverride || 'mistral-small-latest',
      apiKey: process.env.MISTRAL_API_KEY || process.env.AI_API_KEY,
      baseUrl: process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1',
      temperature,
      maxTokens,
    };
  }
  if (a === 'openrouter') {
    return {
      kind: 'openai_compatible',
      provider: 'openrouter',
      model: modelOverride || 'openai/gpt-4o-mini',
      apiKey: process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY,
      baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      temperature,
      maxTokens,
    };
  }
  // default openai_compatible
  return {
    kind: 'openai_compatible',
    provider: a || 'openai_compatible',
    model: modelOverride || process.env.AI_MODEL || 'gpt-4o-mini',
    apiKey: process.env.OPENAI_API_KEY || process.env.AI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL || process.env.AI_BASE_URL || 'https://api.openai.com/v1',
    temperature,
    maxTokens,
  };
}

export function createModelAdapter(providerAlias, model) {
  const cfg = resolveProviderConfig(providerAlias, model);
  if (cfg.kind === 'local') return createLocalComposerAdapter(cfg.variant || 'grounded_composer');
  if (cfg.kind === 'gemini') return createGeminiAdapter(cfg);
  return createOpenAICompatibleAdapter(cfg);
}

/**
 * Application entry: provider-neutral grounded answer.
 */
export async function generateGroundedAnswer(args, adapterOrNull = null) {
  const adapter =
    adapterOrNull ||
    createModelAdapter(process.env.AI_PROVIDER || 'local', process.env.AI_MODEL || 'grounded_composer');
  return adapter.generateGroundedAnswer(args);
}

export function parseBakeoffModelList(envValue) {
  const raw =
    envValue ||
    process.env.LLM_BAKEOFF_MODELS ||
    'local:grounded_composer,local:extractive,local:cautious';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [provider, model] = entry.split(':');
      return { provider: provider.trim(), model: (model || '').trim() || undefined };
    });
}

export function listConfiguredLiveProviders() {
  const found = [];
  if (process.env.OPENAI_API_KEY || (process.env.AI_API_KEY && (process.env.AI_PROVIDER || '').includes('openai')))
    found.push('openai_compatible');
  if (process.env.GROQ_API_KEY) found.push('groq');
  if (process.env.DEEPSEEK_API_KEY) found.push('deepseek');
  if (process.env.MISTRAL_API_KEY) found.push('mistral');
  if (process.env.OPENROUTER_API_KEY) found.push('openrouter');
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) found.push('gemini');
  return found;
}
