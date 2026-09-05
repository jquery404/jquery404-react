#!/usr/bin/env node
/**
 * Agent session CLI (TODO 10).
 *
 *   npm run agent:chat
 *   npm run agent:chat -- --once "Tell me about CadastrAR"
 *   npm run agent:chat -- --script scripts/fixtures/agent_demo_turns.json
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { REPO_ROOT } from './lib/kb-normalize.mjs';
import { loadEnvFile } from './lib/load-env.mjs';
import { createEvidencePipeline } from './lib/kb-pipeline.mjs';
import { createAgentRuntime } from './lib/kb-agent.mjs';

loadEnvFile();

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--') && !a.startsWith('--script') && !a.startsWith('--once')));
const onceIdx = argv.indexOf('--once');
const scriptIdx = argv.indexOf('--script');
const onceMessage =
  onceIdx >= 0 ? argv.slice(onceIdx + 1).filter((a) => !a.startsWith('--')).join(' ').trim() : '';
const scriptPath = scriptIdx >= 0 ? argv[scriptIdx + 1] : null;
const asJson = argv.includes('--json');

function printTurn(result) {
  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log('');
  console.log(`confidence=${result.evidencePack?.confidence} · answerability=${result.answerability} · ${result.provider}:${result.model}`);
  if (result.meta?.failoverUsed) console.log('(failover used)');
  console.log(result.answer);
  if (result.evidenceIds?.length) {
    console.log(`evidence: ${result.evidenceIds.join(', ')}`);
  }
  if (result.toolCall) {
    console.log(`tool: ${result.toolCall.tool} ${JSON.stringify(result.toolCall.args)}`);
  } else if (result.toolRejected) {
    console.log(`tool rejected: ${result.toolRejected.reason}`);
  }
  if (result.session?.focus) {
    console.log(`focus: ${result.session.focus.title || result.session.focus.id}`);
  }
  console.log('');
}

async function main() {
  console.log('Loading evidence pipeline (MiniLM cache if present)…');
  const pipeline = await createEvidencePipeline();
  const agent = createAgentRuntime(pipeline);
  const session = agent.createSession();
  console.log(`session ${session.id}`);
  console.log(`tools: ${agent.toolDefinitions.map((t) => t.name).join(', ')}`);
  console.log(`adapter: ${agent.primaryAdapter.id}${agent.fallbackAdapter ? ` · fallback ${agent.fallbackAdapter.id}` : ''}`);

  if (onceMessage) {
    const result = await agent.handleMessage({
      sessionId: session.id,
      message: onceMessage,
      onEvent: (ev) => {
        if (argv.includes('--verbose')) console.log(`[event] ${ev.type}`);
      },
    });
    printTurn(result);
    return;
  }

  if (scriptPath) {
    const abs = path.isAbsolute(scriptPath) ? scriptPath : path.join(REPO_ROOT, scriptPath);
    const turns = JSON.parse(fs.readFileSync(abs, 'utf8'));
    const messages = Array.isArray(turns) ? turns : turns.messages || [];
    let sessionId = session.id;
    for (const msg of messages) {
      const text = typeof msg === 'string' ? msg : msg.message || msg.content;
      console.log(`> ${text}`);
      const result = await agent.handleMessage({ sessionId, message: text });
      sessionId = result.sessionId;
      printTurn(result);
    }
    return;
  }

  console.log('Interactive agent chat. Commands: /quit  /focus  /session  /json');
  console.log('');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let sessionId = session.id;
  let jsonMode = asJson;

  const ask = () =>
    new Promise((resolve) => {
      rl.question('you> ', resolve);
    });

  while (true) {
    const line = (await ask()).trim();
    if (!line) continue;
    if (line === '/quit' || line === '/exit') break;
    if (line === '/focus') {
      const s = agent.getSession(sessionId);
      console.log(JSON.stringify(s.focus, null, 2));
      continue;
    }
    if (line === '/session') {
      console.log(JSON.stringify(agent.getSession(sessionId), null, 2));
      continue;
    }
    if (line === '/json') {
      jsonMode = !jsonMode;
      console.log(`jsonMode=${jsonMode}`);
      continue;
    }

    const result = await agent.handleMessage({
      sessionId,
      message: line,
      onEvent: (ev) => {
        if (flags.has('--verbose') || argv.includes('--verbose')) {
          process.stdout.write(`[${ev.type}] `);
        }
      },
    });
    sessionId = result.sessionId;
    if (argv.includes('--verbose')) console.log('');
    if (jsonMode) console.log(JSON.stringify(result, null, 2));
    else printTurn(result);
  }

  rl.close();
}

main().catch((err) => {
  console.error('agent:chat FAILED');
  console.error(err);
  process.exit(1);
});
