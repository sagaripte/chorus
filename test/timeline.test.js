/**
 * Timeline tests — emit, query, persistence.
 */
import { strict as assert } from 'assert';
import { Timeline } from '../timeline.js';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

let tmpDir;

function setup() {
  tmpDir = mkdtempSync(join(tmpdir(), 'chorus-tl-test-'));
}

function teardown() {
  rmSync(tmpDir, { recursive: true, force: true });
}

async function testEmitAndGetAll() {
  setup();
  const tl = new Timeline(join(tmpDir, 'tl.jsonl'));
  tl.emit('test', { value: 1 });
  tl.emit('test', { value: 2 });
  const all = tl.getAll();
  assert.equal(all.length, 2);
  assert.equal(all[0].type, 'test');
  assert.equal(all[0].value, 1);
  assert.equal(all[1].value, 2);
  teardown();
}

async function testAutoId() {
  setup();
  const tl = new Timeline(join(tmpDir, 'tl.jsonl'));
  const e1 = tl.emit('a', {});
  const e2 = tl.emit('b', {});
  assert.equal(e1.id, 1);
  assert.equal(e2.id, 2);
  teardown();
}

async function testTimestamp() {
  setup();
  const tl = new Timeline(join(tmpDir, 'tl.jsonl'));
  const before = Date.now();
  const e = tl.emit('test', {});
  const after = Date.now();
  assert(e.ts >= before && e.ts <= after, 'should have valid timestamp');
  teardown();
}

async function testByType() {
  setup();
  const tl = new Timeline(join(tmpDir, 'tl.jsonl'));
  tl.emit('alpha', { v: 1 });
  tl.emit('beta', { v: 2 });
  tl.emit('alpha', { v: 3 });
  const alphas = tl.byType('alpha');
  assert.equal(alphas.length, 2);
  assert.equal(alphas[0].v, 1);
  assert.equal(alphas[1].v, 3);
  teardown();
}

async function testByAgent() {
  setup();
  const tl = new Timeline(join(tmpDir, 'tl.jsonl'));
  tl.emit('msg', { from: 'alice', content: 'hi' });
  tl.emit('msg', { from: 'bob', content: 'hey' });
  tl.emit('msg', { from: 'alice', content: 'bye' });
  const aliceEvents = tl.byAgent('alice');
  assert.equal(aliceEvents.length, 2);
  teardown();
}

async function testLast() {
  setup();
  const tl = new Timeline(join(tmpDir, 'tl.jsonl'));
  for (let i = 0; i < 20; i++) tl.emit('test', { i });
  const last5 = tl.last(5);
  assert.equal(last5.length, 5);
  assert.equal(last5[0].i, 15);
  assert.equal(last5[4].i, 19);
  teardown();
}

async function testFilter() {
  setup();
  const tl = new Timeline(join(tmpDir, 'tl.jsonl'));
  tl.emit('score', { value: 10 });
  tl.emit('score', { value: 90 });
  tl.emit('score', { value: 50 });
  const high = tl.filter(e => e.value > 40);
  assert.equal(high.length, 2);
  teardown();
}

async function testPersistence() {
  setup();
  const path = join(tmpDir, 'persist.jsonl');
  const tl1 = new Timeline(path);
  tl1.emit('test', { v: 1 });
  tl1.emit('test', { v: 2 });

  // Create new instance from same file
  const tl2 = new Timeline(path);
  const all = tl2.getAll();
  assert.equal(all.length, 2, 'should load existing events');
  assert.equal(all[0].v, 1);
  teardown();
}

async function testClear() {
  setup();
  const tl = new Timeline(join(tmpDir, 'tl.jsonl'));
  tl.emit('test', {});
  tl.emit('test', {});
  tl.clear();
  assert.equal(tl.getAll().length, 0);
  teardown();
}

async function testContext() {
  setup();
  const tl = new Timeline(join(tmpDir, 'tl.jsonl'));
  const e = tl.emit('test', { data: 'hello' }, { round: 3, day: 'Monday' });
  assert.equal(e.round, 3);
  assert.equal(e.day, 'Monday');
  assert.equal(e.data, 'hello');
  teardown();
}

// ─── Run ────────────────────────────────────────────────────────────────────

const tests = [
  testEmitAndGetAll,
  testAutoId,
  testTimestamp,
  testByType,
  testByAgent,
  testLast,
  testFilter,
  testPersistence,
  testClear,
  testContext,
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  try {
    await test();
    console.log(`  ✓ ${test.name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${test.name}: ${e.message}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
