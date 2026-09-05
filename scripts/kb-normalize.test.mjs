import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeKnowledgeBase,
  contentHash,
  diffSnapshots,
  extractResearchSlugFromUrl,
  stripHtml,
} from './lib/kb-normalize.mjs';

const baseFixture = () => ({
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
            links: { abstract: 'Abstract duplicate of detail.' },
          },
          {
            title: 'List Only Paper',
            url: 'https://example.com/paper',
            links: { abstract: 'Only on the list.' },
          },
        ],
      },
      {
        type: 'book',
        title: 'TensorFlow Lite for Mobile Development',
        desc: 'Deploy ML models on mobile.',
        attributes: { ISBN: '9781484266663' },
      },
    ],
    research: [
      {
        slug: 'demo',
        title: 'Demo Paper',
        journal: 'Test Conf',
        tags: 'xr, collaboration',
        desc: 'Detail description for demo.',
        authors: [{ name: 'Faisal Zaman', url: '', affiliation: '' }],
        articles: {
          list: [
            {
              header: 'Press About Demo',
              archive: '/archive/press/demo-press/go.html',
            },
          ],
        },
      },
    ],
  },
  portfolioJson: {
    portfolio: [
      {
        slug: 'nexschool',
        title: 'NexSchool - Unified Learning Management System',
        desc: 'I was the Front End Developer for the LMS.',
        tags: 'web',
        url: '',
      },
      {
        slug: 'linz',
        title: 'Plan Generation in New Landonline',
        desc: 'Survey plan generation tooling.',
        tags: 'web',
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
        tags: 'android, ios, education',
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
      url: 'http://jquery404.github.io/#/r/demo',
    },
    {
      title: 'NZGDC 2025',
      date: "25-27 Sep'25",
      place: 'Wellington, NZ',
      role: 'presented',
      url: 'http://jquery404.github.io/#/r/jigshare',
    },
  ],
});

test('stripHtml removes tags', () => {
  assert.equal(stripHtml('<b>Faisal</b> Zaman'), 'Faisal Zaman');
});

test('extractResearchSlugFromUrl supports hash and plain routes', () => {
  assert.equal(extractResearchSlugFromUrl('/#/r/xrgait'), 'xrgait');
  assert.equal(extractResearchSlugFromUrl('/r/mrmac'), 'mrmac');
  assert.equal(extractResearchSlugFromUrl('https://example.com'), null);
});

test('nexschool portfolio+app merge is deterministic and single identity', () => {
  const a = normalizeKnowledgeBase(baseFixture());
  const b = normalizeKnowledgeBase(baseFixture());
  const nexA = a.records.find((r) => r.id === 'nexschool');
  const nexB = b.records.find((r) => r.id === 'nexschool');
  assert.ok(nexA);
  assert.equal(nexA.type, 'project');
  assert.equal(nexA.route, '/#/p/nexschool');
  assert.deepEqual(nexA.alsoRoutes, ['/#/a/nexschool']);
  assert.equal(nexA.contentHash, nexB.contentHash);
  assert.equal(a.records.filter((r) => r.id === 'nexschool').length, 1);
  assert.equal(a.stats.duplicatesMerged, 1);
  assert.match(nexA.text, /Front End Developer/);
  assert.match(nexA.text, /LMS in your pocket|Attendance/);
});

test('research detail wins over list duplicate; list-only remains', () => {
  const { records, stats } = normalizeKnowledgeBase(baseFixture());
  assert.ok(records.find((r) => r.type === 'research' && r.id === 'demo'));
  assert.equal(
    records.filter((r) => r.type === 'list_research' && r.text.includes('Abstract duplicate')).length,
    0
  );
  assert.ok(records.find((r) => r.type === 'list_research' && r.title === 'List Only Paper'));
  assert.ok(stats.listPubsSkippedAsDetailDupes >= 1);
});

test('confirmed relationships preserved; jigshare unresolved', () => {
  const { records, unresolved } = normalizeKnowledgeBase(baseFixture());
  const demo = records.find((r) => r.id === 'demo');
  assert.ok(demo.related.some((r) => r.type === 'press' && r.id === 'demo-press' && r.confidence === 'confirmed'));
  assert.ok(demo.related.some((r) => r.type === 'event' && r.confidence === 'confirmed'));
  const press = records.find((r) => r.id === 'demo-press');
  assert.ok(press.related.some((r) => r.id === 'demo' && r.relation === 'press_about'));
  assert.ok(unresolved.some((u) => u.kind === 'event_route' && u.missingResearchSlug === 'jigshare'));
});

test('event ids are bare slugs (no event:event: double prefix)', () => {
  const { records } = normalizeKnowledgeBase(baseFixture());
  const events = records.filter((r) => r.type === 'event');
  assert.ok(events.length >= 1);
  for (const ev of events) {
    assert.ok(!String(ev.id).startsWith('event:'), `id must be bare slug, got ${ev.id}`);
    assert.ok(!/^event:event:/.test(`event:${ev.id}`));
  }
  const ozchi = events.find((e) => e.title === 'OzCHI 2025');
  assert.ok(ozchi);
  assert.equal(ozchi.id, 'ozchi-2025-29-nov-3-dec-25');
});

test('routes and hashes stable; edit changes hash; delete detected', () => {
  const first = normalizeKnowledgeBase(baseFixture());
  const second = normalizeKnowledgeBase(baseFixture());
  assert.deepEqual(
    first.records.map((r) => [r.type, r.id, r.contentHash]),
    second.records.map((r) => [r.type, r.id, r.contentHash])
  );

  const edited = baseFixture();
  edited.portfolioJson.portfolio.find((p) => p.slug === 'linz').desc = 'Survey plan generation tooling (updated).';
  const afterEdit = normalizeKnowledgeBase(edited);
  const diffEdit = diffSnapshots(first.records, afterEdit.records);
  assert.ok(diffEdit.changed.includes('project:linz'));
  assert.equal(diffEdit.added.length, 0);

  const withNew = baseFixture();
  withNew.researchJson.research.push({
    slug: 'newitem',
    title: 'Brand New Research',
    journal: 'Conf',
    desc: 'A new canonical research item.',
    tags: 'xr',
    authors: [{ name: 'Faisal Zaman' }],
  });
  const afterAdd = normalizeKnowledgeBase(withNew);
  const diffAdd = diffSnapshots(first.records, afterAdd.records);
  assert.ok(diffAdd.added.includes('research:newitem'));
  assert.equal(afterAdd.records.find((r) => r.id === 'newitem').route, '/#/r/newitem');

  const removed = baseFixture();
  removed.portfolioJson.portfolio = removed.portfolioJson.portfolio.filter((p) => p.slug !== 'linz');
  const afterRemove = normalizeKnowledgeBase(removed);
  const diffRemove = diffSnapshots(first.records, afterRemove.records);
  assert.ok(diffRemove.removed.includes('project:linz'));
});

test('malformed canonical data fails loudly', () => {
  const bad = baseFixture();
  bad.portfolioJson = { portfolio: [{ title: 'No slug here' }] };
  assert.throws(() => normalizeKnowledgeBase(bad), /missing required slug/);
});

test('contentHash covers retrieval payload', () => {
  const rec = {
    type: 'project',
    id: 'x',
    route: '/#/p/x',
    title: 'X',
    text: 'hello',
    tags: [],
    related: [],
    provenance: { sourceType: 't', sourcePath: 'p', sourceId: 'x', fieldsUsed: [] },
  };
  assert.equal(contentHash(rec).length, 16);
  assert.notEqual(contentHash(rec), contentHash({ ...rec, text: 'hello!' }));
});

test('credentials and capabilities normalize with evidence refs (no body duplication)', () => {
  const data = baseFixture();
  data.credentialsJson = {
    credentials: [
      {
        id: 'aws-sap',
        title: 'AWS Solutions Architect – Professional',
        kind: 'certification',
        issuer: 'Amazon Web Services',
        url: 'https://www.credly.com/users/fzaman',
        tags: 'aws, cloud',
        summary: 'AWS SAP via Credly.',
      },
      {
        id: 'phd-computer-graphics',
        title: 'Ph.D., Computer Graphics',
        kind: 'education',
        issuer: 'Victoria University of Wellington',
        relatedResearch: ['demo'],
        route: '/#/r/demo',
        tags: 'phd, education',
        summary: 'Ph.D. in Computer Graphics.',
      },
    ],
  };
  data.capabilitiesJson = {
    capabilities: [
      {
        id: 'product_thinking',
        capability: 'product_thinking',
        label: 'Product thinking',
        claimStrength: 'reasonably_inferred',
        queryTerms: ['product', 'product thinking'],
        evidenceKeys: ['project:nexschool', 'project:linz'],
        notes: 'Inferred; not a PM title.',
      },
      {
        id: 'ai_machine_learning',
        capability: 'ai_machine_learning',
        label: 'AI / machine learning',
        claimStrength: 'direct',
        queryTerms: ['AI', 'machine learning'],
        evidenceKeys: ['book:tensorflow-lite-for-mobile-development'],
        notes: 'Book evidence only in fixture.',
      },
    ],
  };

  const { records, unresolved, stats } = normalizeKnowledgeBase(data);
  assert.equal(stats.canonical.credentials, 2);
  assert.equal(stats.canonical.capabilities, 2);

  const aws = records.find((r) => r.type === 'credential' && r.id === 'aws-sap');
  assert.ok(aws);
  assert.match(aws.text, /AWS Solutions Architect/);
  assert.ok(aws.tags.includes('aws'));

  const phd = records.find((r) => r.type === 'credential' && r.id === 'phd-computer-graphics');
  assert.ok(phd.related.some((r) => r.id === 'demo' && r.confidence === 'confirmed'));

  const product = records.find((r) => r.type === 'capability' && r.id === 'product_thinking');
  assert.equal(product.extras.claimStrength, 'reasonably_inferred');
  assert.ok(product.related.every((r) => r.confidence === 'confirmed'));
  assert.ok(product.related.some((r) => r.type === 'project' && r.id === 'nexschool'));
  // Must not restate nexschool body
  assert.equal(product.text.includes('Front End Developer'), false);

  const book = records.find((r) => r.type === 'book');
  assert.equal(book.id, 'tensorflow-lite-for-mobile-development');

  assert.equal(
    unresolved.filter((u) => u.kind === 'capability_evidence_missing').length,
    0
  );
});

test('capability with missing evidence stays unresolved (no guessing)', () => {
  const data = baseFixture();
  data.capabilitiesJson = {
    capabilities: [
      {
        id: 'ghost',
        capability: 'ghost',
        label: 'Ghost',
        claimStrength: 'direct',
        queryTerms: ['ghost'],
        evidenceKeys: ['project:does-not-exist'],
        notes: 'Should unresolved.',
      },
    ],
  };
  const { unresolved, records } = normalizeKnowledgeBase(data);
  assert.ok(unresolved.some((u) => u.kind === 'capability_evidence_missing'));
  const ghost = records.find((r) => r.id === 'ghost');
  assert.ok(ghost.related.some((r) => r.confidence === 'uncertain'));
});
