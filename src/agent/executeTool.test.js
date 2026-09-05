import {
  hashRouteToPath,
  pathForOpenRecord,
  planToolExecution,
  executeAgentTool,
  isRedundantNavigation,
} from './executeTool';
import { activityFromAgentEvent, MASCOT_ACTIVITY } from './mascotActivity';
import { STARTER_PROMPTS } from './starterPrompts';

describe('agent executeTool', () => {
  test('maps hash routes', () => {
    expect(hashRouteToPath('/#/r/cadastrar')).toBe('/r/cadastrar');
    expect(hashRouteToPath('https://evil.example')).toBeNull();
  });

  test('openRecord and contact tools', () => {
    expect(pathForOpenRecord({ route: '/#/r/cadastrar', id: 'cadastrar' })).toBe('/r/cadastrar');
    expect(planToolExecution({ tool: 'showContact', args: { route: '/#/contact' } }).path).toBe(
      '/contact'
    );
  });

  test('showCV is gracefully unavailable (no CV asset in repo)', () => {
    expect(planToolExecution({ tool: 'showCV', args: {} }).kind).toBe('cv_unavailable');
  });

  test('showCV does not navigate away', () => {
    const paths = [];
    const notes = [];
    executeAgentTool(
      { tool: 'showCV', args: {} },
      { navigate: (p) => paths.push(p), onNote: (n) => notes.push(n) }
    );
    expect(paths).toEqual([]);
    expect(notes[0]).toMatch(/No downloadable CV/i);
  });

  test('isRedundantNavigation when already on record', () => {
    const ui = { recordId: 'cadastrar', pathname: '/r/cadastrar', viewType: 'research' };
    expect(isRedundantNavigation({ tool: 'openRecord', args: { id: 'cadastrar' } }, ui)).toBe(true);
    expect(
      isRedundantNavigation({ tool: 'openRoute', args: { route: '/#/r/cadastrar' } }, ui)
    ).toBe(true);
    expect(isRedundantNavigation({ tool: 'openRecord', args: { id: 'mrmac' } }, ui)).toBe(false);
    expect(isRedundantNavigation({ tool: 'showContact', args: {} }, ui)).toBe(false);
  });

  test('executeAgentTool navigates', () => {
    const paths = [];
    executeAgentTool(
      { tool: 'openRoute', args: { route: '/#/r/cadastrar' } },
      { navigate: (p) => paths.push(p) }
    );
    expect(paths).toEqual(['/r/cadastrar']);
  });
});

describe('mascot activity', () => {
  test('maps events', () => {
    expect(activityFromAgentEvent('retrieval.started')).toBe(MASCOT_ACTIVITY.THINKING);
    expect(activityFromAgentEvent('answer.delta')).toBe(MASCOT_ACTIVITY.RESPONDING);
    expect(activityFromAgentEvent('tool.requested')).toBe(MASCOT_ACTIVITY.PRESENTING);
  });
});

describe('publicAssetUrl', () => {
  // eslint-disable-next-line global-require
  const { publicAssetUrl } = require('./browserKbEngine');

  test('always returns root-absolute asset paths', () => {
    expect(publicAssetUrl('assets/kb/browser_kb_v1.json')).toMatch(/\/assets\/kb\/browser_kb_v1\.json$/);
    expect(publicAssetUrl('/assets/kb/runtime.mjs')).toMatch(/\/assets\/kb\/runtime\.mjs$/);
    expect(publicAssetUrl('assets/kb/x.json').includes('r/cadastrar')).toBe(false);
  });
});

describe('starters', () => {
  test('has recruiter prompts', () => {
    expect(STARTER_PROMPTS.length).toBeGreaterThanOrEqual(4);
  });
});

describe('recruiterSafeError', () => {
  // eslint-disable-next-line global-require
  const { recruiterSafeError } = require('./recruiterSafeError');

  test('maps HTML/JSON failures to friendly copy', () => {
    const htmlish = recruiterSafeError({
      message: 'Generate endpoint returned HTML instead of JSON. <!DOCTYPE html>',
      code: 'bridge_unavailable',
    });
    expect(htmlish.message).not.toMatch(/<!DOCTYPE|JSON\.parse/i);
    const parse = recruiterSafeError({
      message: 'Invalid generate JSON: Unexpected token < in JSON',
      code: 'gateway_error',
    });
    expect(parse.message).not.toMatch(/Unexpected token/i);
    expect(parse.message).toMatch(/try again|could not finish/i);
  });
});
