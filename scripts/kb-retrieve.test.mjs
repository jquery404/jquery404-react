import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalizeKnowledgeBase, diffSnapshots, contentHash } from './lib/kb-normalize.mjs';
import {
  MemoryKbStore,
  JsonKbStore,
  scoreRecord,
  recordKey,
  tokenize,
} from './lib/kb-retrieve.mjs';

function fixtureRecords() {
  const { records } = normalizeKnowledgeBase({
    researchJson: {
      homeResearch: ['/r/demo'],
      project: [
        {
          type: 'research',
          title: 'Group',
          publications: [
            {
              title: 'Demo Paper',
              url: '/r/demo',
              links: { abstract: 'dup' },
            },
          ],
        },
      ],
      research: [
        {
          slug: 'demo',
          title: 'Demo Mixed Reality Paper',
          journal: 'Test Conf',
          tags: 'xr, collaboration',
          desc: 'Detail description for mixed reality collaboration demo.',
          authors: [{ name: 'Faisal Zaman' }],
          articles: {
            list: [{ header: 'Press About Demo', archive: '/archive/press/demo-press/go.html' }],
          },
        },
        {
          slug: 'xrgait',
          title: 'XRGait Study',
          journal: 'OzCHI',
          tags: 'xr, gait',
          desc: 'Gait analysis in XR.',
          authors: [{ name: 'Faisal Zaman' }],
        },
      ],
    },
    portfolioJson: {
      portfolio: [
        {
          slug: 'nexschool',
          title: 'NexSchool LMS',
          desc: 'I was the Front End Developer for the LMS.',
          tags: 'web, mobile',
          url: '',
        },
        {
          slug: 'linz',
          title: 'Plan Generation in New Landonline',
          desc: 'Survey plan generation tooling with geospatial data.',
          tags: 'web, data',
          url: 'https://example.com/linz',
        },
      ],
    },
    appsJson: {
      apps: [
        {
          slug: 'nexschool',
          title: 'NexSchool',
          tagline: 'LMS in your pocket',
          desc: 'Attendance, grading, timetables for schools.',
          category: 'Education',
          platform: ['android', 'ios'],
          tags: 'android, ios, education, mobile',
          version: '1.0.0',
          updated: '2025-08-14',
        },
      ],
    },
    pressMetas: [
      {
        id: 'demo-press',
        title: 'Press About Demo',
        source: 'Test Source',
        originalUrl: 'https://example.com/press',
        relatedResearch: ['demo'],
        _sourcePath: 'public/archive/press/demo-press/meta.json',
      },
    ],
    events: [
      {
        title: 'OzCHI 2025',
        date: "29 Nov - 3 Dec'25",
        place: 'Sydney, AU',
        role: 'presented',
        url: 'http://jquery404.github.io/#/r/xrgait',
      },
    ],
  });
  return records;
}

function withUpdatedText(record, text) {
  const { contentHash: _c, ...rest } = record;
  rest.text = text;
  return { ...rest, contentHash: contentHash(rest) };
}

test('tokenize splits query terms', () => {
  assert.deepEqual(tokenize('Mixed Reality'), ['mixed', 'reality']);
});

test('added then unchanged sync performs no unnecessary updates', () => {
  const store = new MemoryKbStore();
  const v1 = fixtureRecords();
  const sync1 = store.syncRecords(v1);
  assert.equal(sync1.stats.inserted, v1.length);
  assert.equal(store.size(), v1.length);

  const sync2 = store.syncRecords(v1);
  assert.equal(sync2.changeSet.unchanged.length, v1.length);
  assert.equal(sync2.changeSet.added.length, 0);
  assert.equal(sync2.changeSet.changed.length, 0);
  assert.equal(sync2.changeSet.removed.length, 0);
  assert.equal(sync2.stats.inserted, 0);
  assert.equal(sync2.stats.updated, 0);
  assert.equal(sync2.stats.skippedUnchanged, v1.length);
  assert.equal(sync2.stats.deleted, 0);
});

test('incremental sync: change, delete, add', () => {
  const store = new MemoryKbStore();
  const v1 = fixtureRecords();
  store.syncRecords(v1);

  const v2 = structuredClone(v1);
  const linzIdx = v2.findIndex((r) => r.type === 'project' && r.id === 'linz');
  v2[linzIdx] = withUpdatedText(v2[linzIdx], `${v2[linzIdx].text}\nUpdated geospatial notes.`);

  const syncChange = store.syncRecords(v2);
  assert.ok(syncChange.changeSet.changed.includes('project:linz'));
  assert.equal(syncChange.stats.updated, 1);
  assert.equal(store.get('project:linz').text.includes('Updated geospatial notes'), true);

  const v3 = v2.filter((r) => !(r.type === 'project' && r.id === 'linz'));
  const syncDel = store.syncRecords(v3);
  assert.ok(syncDel.changeSet.removed.includes('project:linz'));
  assert.equal(syncDel.stats.deleted, 1);
  assert.equal(store.get('project:linz'), null);
  assert.equal(store.has('linz'), false);

  const v4 = structuredClone(v3);
  const neo = {
    type: 'research',
    id: 'newitem',
    route: '/#/r/newitem',
    title: 'Brand New',
    text: 'Brand new research about collaboration.',
    tags: ['xr'],
    related: [],
    provenance: {
      sourceType: 'test',
      sourcePath: 'test',
      sourceId: 'newitem',
      fieldsUsed: ['title'],
    },
  };
  neo.contentHash = contentHash(neo);
  v4.push(neo);

  const syncAdd = store.syncRecords(v4);
  assert.ok(syncAdd.changeSet.added.includes('research:newitem'));
  assert.equal(syncAdd.stats.inserted, 1);
  assert.ok(store.get('research:newitem'));
});

test('stable lookup by ID and relationship retrieval', () => {
  const store = new MemoryKbStore();
  store.syncRecords(fixtureRecords());

  const byCompound = store.get('research:demo');
  const byBare = store.get('demo');
  assert.equal(byCompound.id, 'demo');
  assert.equal(byBare.id, 'demo');
  assert.equal(byCompound.route, '/#/r/demo');

  const related = store.getRelated('research:demo');
  assert.ok(related.some((r) => r.type === 'press' && r.id === 'demo-press' && r.found));
  assert.ok(related.every((r) => r.confidence === 'confirmed'));
});

test('deduplicated nexschool remains a single indexed identity', () => {
  const store = new MemoryKbStore();
  store.syncRecords(fixtureRecords());
  const all = store.list().filter((r) => r.id === 'nexschool');
  assert.equal(all.length, 1);
  assert.equal(all[0].type, 'project');
  assert.equal(all[0].route, '/#/p/nexschool');
  assert.deepEqual(all[0].alsoRoutes, ['/#/a/nexschool']);
});

test('search is deterministic and weights title/tags/id', () => {
  const store = new MemoryKbStore();
  store.syncRecords(fixtureRecords());

  const a = store.search('gait', { limit: 5 });
  const b = store.search('gait', { limit: 5 });
  assert.deepEqual(
    a.map((h) => [h.key, h.score]),
    b.map((h) => [h.key, h.score])
  );
  assert.equal(a[0].id, 'xrgait');

  const byId = store.search('xrgait', { limit: 3 });
  assert.ok(byId[0].id === 'xrgait');
  assert.ok(byId[0].score > scoreRecord(store.get('research:xrgait'), 'collaboration').score);

  const collab = store.search('collaboration', { limit: 5 });
  assert.ok(collab.some((h) => h.id === 'demo'));

  const mobile = store.search('mobile', { limit: 5 });
  assert.ok(mobile.some((h) => h.id === 'nexschool'));

  const expanded = store.search('gait', { limit: 1, expandRelated: true });
  assert.ok(Array.isArray(expanded[0].related));
});

test('applyDiff skips unchanged and removes deleted', () => {
  const store = new MemoryKbStore();
  const records = fixtureRecords();
  store.syncRecords(records);

  const changeSet = {
    added: [],
    changed: [],
    unchanged: records.map((r) => recordKey(r)),
    removed: [],
  };
  const stats = store.applyDiff(changeSet, records);
  assert.equal(stats.inserted, 0);
  assert.equal(stats.updated, 0);
  assert.equal(stats.skippedUnchanged, records.length);

  const onlyDemo = records.filter((r) => r.id === 'demo' || r.id === 'demo-press');
  const cs2 = diffSnapshots(store.list(), onlyDemo);
  const stats2 = store.applyDiff(cs2, onlyDemo);
  assert.ok(stats2.deleted > 0);
  assert.equal(store.get('project:linz'), null);
  assert.ok(store.get('research:demo'));
});

test('JsonKbStore persists and reloads', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-store-'));
  const file = path.join(dir, 'kb_index.json');
  const store = new JsonKbStore(file);
  store.syncRecords(fixtureRecords());
  store.save({ test: true });

  const reloaded = new JsonKbStore(file);
  assert.equal(reloaded.size(), store.size());
  assert.equal(reloaded.get('research:xrgait').title, 'XRGait Study');
});

test('credentials + capabilities sync into retrieval and answer AWS/product', () => {
  const { records } = normalizeKnowledgeBase({
    researchJson: {
      homeResearch: [],
      project: [
        {
          type: 'book',
          title: 'TensorFlow Lite for Mobile Development',
          desc: 'Deploy ML models on mobile.',
        },
      ],
      research: [
        {
          slug: 'cadastrar',
          title: 'CadastrAR',
          journal: 'GeoCart',
          tags: 'xr',
          desc: 'Stakeholder field decision support.',
          authors: [{ name: 'Faisal Zaman' }],
        },
      ],
    },
    portfolioJson: {
      portfolio: [
        {
          slug: 'nexschool',
          title: 'NexSchool',
          desc: 'LMS modules and maintenance.',
          tags: 'mobile',
        },
      ],
    },
    appsJson: { apps: [] },
    pressMetas: [],
    events: [],
    credentialsJson: {
      credentials: [
        {
          id: 'aws-sap',
          title: 'AWS Solutions Architect – Professional',
          kind: 'certification',
          issuer: 'Amazon Web Services',
          url: 'https://www.credly.com/users/fzaman',
          tags: 'aws, cloud, solutions architect',
          summary: 'AWS Solutions Architect – Professional on Credly.',
        },
      ],
    },
    capabilitiesJson: {
      capabilities: [
        {
          id: 'product_thinking',
          capability: 'product_thinking',
          label: 'Product thinking',
          claimStrength: 'reasonably_inferred',
          queryTerms: ['product', 'product thinking'],
          evidenceKeys: ['project:nexschool', 'research:cadastrar'],
          notes: 'Inferred only.',
        },
        {
          id: 'ai_machine_learning',
          capability: 'ai_machine_learning',
          label: 'AI / machine learning',
          claimStrength: 'direct',
          queryTerms: ['AI', 'machine learning', 'TensorFlow'],
          evidenceKeys: ['book:tensorflow-lite-for-mobile-development'],
          notes: 'Direct book evidence.',
        },
      ],
    },
  });

  const store = new MemoryKbStore();
  store.syncRecords(records);

  const awsHits = store.search('AWS', { limit: 3 });
  assert.ok(awsHits.some((h) => h.key === 'credential:aws-sap'));

  const productHits = store.search('product', { limit: 5 });
  assert.ok(productHits.some((h) => h.key === 'capability:product_thinking'));
  const related = store.getRelated('capability:product_thinking');
  assert.ok(related.some((r) => r.key === 'project:nexschool' && r.found));

  const aiHits = store.search('AI', { limit: 5 });
  assert.ok(aiHits.some((h) => h.key === 'capability:ai_machine_learning'));

  // Editing credential changes hash and syncs as update
  const edited = structuredClone(records);
  const awsIdx = edited.findIndex((r) => r.id === 'aws-sap');
  edited[awsIdx] = withUpdatedText(edited[awsIdx], `${edited[awsIdx].text}\nRenewed.`);
  const sync = store.syncRecords(edited);
  assert.ok(sync.changeSet.changed.includes('credential:aws-sap'));
  assert.equal(sync.stats.updated, 1);
});
