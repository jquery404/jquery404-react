/**
 * Frontend agent UI contract tests (TODO 11).
 * Mirrors pure helpers in src/agent/* without importing CRA sources into Node.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function hashRouteToPath(route) {
  const raw = String(route || '').trim();
  if (!raw) return null;
  if (raw.startsWith('/#/')) return raw.slice(2) || '/';
  if (raw.startsWith('/#')) return raw.slice(2) || '/';
  if (raw.startsWith('/')) return raw;
  return null;
}

test('src agent modules exist and stay browser-safe', () => {
  const files = [
    'src/agent/agentClient.js',
    'src/agent/executeTool.js',
    'src/agent/AgentContext.js',
    'src/agent/AgentChatPanel.js',
    'src/setupProxy.js',
    'scripts/agent-bridge.mjs',
  ];
  for (const f of files) {
    assert.ok(fs.existsSync(path.join(root, f)), `missing ${f}`);
  }
  const client = fs.readFileSync(path.join(root, 'src/agent/agentClient.js'), 'utf8');
  assert.ok(
    !/from\s+['"].*scripts\/lib\//.test(client),
    'AgentClient must not import Node runtime modules'
  );
  assert.ok(!/AI_API_KEY|OPENAI_API_KEY|GEMINI_API_KEY/.test(client), 'no secrets in client');
  const bridge = fs.readFileSync(path.join(root, 'scripts/agent-bridge.mjs'), 'utf8');
  assert.match(bridge, /createAgentRuntime/);
  assert.match(bridge, /Never deploy/i);
});

test('hashRouteToPath contract', () => {
  assert.equal(hashRouteToPath('/#/r/cadastrar'), '/r/cadastrar');
  assert.equal(hashRouteToPath('/#/contact'), '/contact');
  assert.equal(hashRouteToPath('https://evil.example'), null);
});

test('executeTool source rejects DOM/CSS invention surface', () => {
  const src = fs.readFileSync(path.join(root, 'src/agent/executeTool.js'), 'utf8');
  assert.ok(!/querySelector|getElementById|classList|pixel|animationName/.test(src));
  assert.match(src, /openRecord/);
  assert.match(src, /showContact/);
  assert.match(src, /showCV/);
});

test('starter prompts present', () => {
  const src = fs.readFileSync(path.join(root, 'src/agent/starterPrompts.js'), 'utf8');
  assert.match(src, /What have you built/);
  assert.match(src, /best work/);
  assert.match(src, /AI/);
  assert.match(src, /research and products connect/);
  assert.ok(!/Why should we hire him/.test(src));
});

test('mascot activity mapping present', () => {
  const src = fs.readFileSync(path.join(root, 'src/agent/mascotActivity.js'), 'utf8');
  assert.match(src, /thinking/);
  assert.match(src, /responding/);
  assert.match(src, /presenting/);
  assert.match(src, /settling/);
  assert.match(src, /retrieval\.started/);
});

test('production deploy wires public generate URL without secrets', () => {
  const yml = fs.readFileSync(path.join(root, '.github/workflows/deploy.yml'), 'utf8');
  assert.match(yml, /REACT_APP_AGENT_ENABLED:\s*'true'/);
  assert.match(yml, /REACT_APP_AGENT_MODE:\s*split/);
  assert.match(yml, /lm0utr1vmi\.execute-api\.ap-southeast-2\.amazonaws\.com/);
  assert.ok(!/GROQ_API_KEY|AI_API_KEY|SECRET/.test(yml));
  assert.ok(!fs.existsSync(path.join(root, 'aws')), 'obsolete aws/ experiment must be removed');
});

test('recruiter chat hides Evidence / Also related / raw ids unless debug', () => {
  const panel = fs.readFileSync(path.join(root, 'src/agent/AgentChatPanel.js'), 'utf8');
  assert.match(panel, /isAgentDebug|agentDebug/);
  assert.match(panel, /debug && evidenceHints/);
  assert.match(panel, /debug && suggestedViews/);
  assert.match(panel, /presentableLinks/);
  assert.match(panel, /panelSubtitle/);
  assert.ok(!/uiContext\.viewType\}/.test(panel) || panel.includes("viewType === 'page'"));
  const dbg = fs.readFileSync(path.join(root, 'src/agent/agentDebug.js'), 'utf8');
  assert.match(dbg, /REACT_APP_AGENT_DEBUG/);
  assert.match(dbg, /agentDebug/);
});

test('single InteractiveMascot ownership in companion', () => {
  const panel = fs.readFileSync(path.join(root, 'src/agent/AgentChatPanel.js'), 'utf8');
  assert.match(panel, /InteractiveMascot/);
  const about = fs.readFileSync(path.join(root, 'src/components/About.js'), 'utf8');
  assert.ok(!/InteractiveMascot/.test(about), 'About must not mount a second mascot');
  assert.match(about, /hs-mascot-slot/);
  const app = fs.readFileSync(path.join(root, 'src/App.js'), 'utf8');
  assert.match(app, /AgentChatPanel/);
});

test('recruiterSafeError never leaks HTML/JSON parser dumps', () => {
  const src = fs.readFileSync(path.join(root, 'src/agent/recruiterSafeError.js'), 'utf8');
  assert.match(src, /recruiterSafeError/);
  assert.match(src, /HTML instead of JSON/);
  assert.match(src, /portfolio is still fully usable/);
  assert.ok(!/stack\.join|console\.error\(err\)/.test(src));
});

test('applyUiContextFocus seeds session focus from HashRouter record', () => {
  const src = fs.readFileSync(path.join(root, 'src/agent/splitAgentClient.js'), 'utf8');
  assert.match(src, /export function applyUiContextFocus/);
  assert.match(src, /applyUiContextFocus\(session, input\.uiContext\)/);
  assert.match(src, /research|project|app/);
  assert.match(src, /session\.focus/);
});
