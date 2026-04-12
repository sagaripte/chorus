/**
 * Store tests — FileStore and resolveStore.
 */
import { strict as assert } from 'assert';
import { Store, FileStore, resolveStore } from '../store.js';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

let tmpDir;

function setup() {
  tmpDir = mkdtempSync(join(tmpdir(), 'chorus-store-test-'));
}

function teardown() {
  rmSync(tmpDir, { recursive: true, force: true });
}

async function testAppendAndRead() {
  setup();
  const store = new FileStore(join(tmpDir, 'test.jsonl'));
  store.append('line 1');
  store.append('line 2');
  store.append('line 3');
  const lines = store.read();
  assert.deepEqual(lines, ['line 1', 'line 2', 'line 3']);
  teardown();
}

async function testReadEmpty() {
  setup();
  const store = new FileStore(join(tmpDir, 'empty.jsonl'));
  const lines = store.read();
  assert.deepEqual(lines, []);
  teardown();
}

async function testWrite() {
  setup();
  const store = new FileStore(join(tmpDir, 'write.jsonl'));
  store.append('old line');
  store.write(['new 1', 'new 2']);
  const lines = store.read();
  assert.deepEqual(lines, ['new 1', 'new 2']);
  teardown();
}

async function testExists() {
  setup();
  const store = new FileStore(join(tmpDir, 'exists.jsonl'));
  assert.equal(store.exists(), false, 'should not exist before write');
  store.append('data');
  assert.equal(store.exists(), true, 'should exist after write');
  teardown();
}

async function testClear() {
  setup();
  const store = new FileStore(join(tmpDir, 'clear.jsonl'));
  store.append('data');
  store.clear();
  const lines = store.read();
  assert.deepEqual(lines, []);
  teardown();
}

async function testNestedDir() {
  setup();
  const store = new FileStore(join(tmpDir, 'nested', 'deep', 'test.jsonl'));
  store.append('works');
  assert.deepEqual(store.read(), ['works']);
  teardown();
}

async function testResolveStoreString() {
  setup();
  const store = resolveStore(join(tmpDir, 'resolve.jsonl'));
  assert(store instanceof FileStore);
  teardown();
}

async function testResolveStoreInstance() {
  setup();
  const original = new FileStore(join(tmpDir, 'instance.jsonl'));
  const resolved = resolveStore(original);
  assert.equal(resolved, original, 'should return the same instance');
  teardown();
}

async function testBaseStoreThrows() {
  const base = new Store();
  assert.throws(() => base.append('x'), /not implemented/);
  assert.throws(() => base.read(), /not implemented/);
  assert.throws(() => base.write([]), /not implemented/);
  assert.throws(() => base.exists(), /not implemented/);
  assert.throws(() => base.clear(), /not implemented/);
}

// ─── Run ────────────────────────────────────────────────────────────────────

const tests = [
  testAppendAndRead,
  testReadEmpty,
  testWrite,
  testExists,
  testClear,
  testNestedDir,
  testResolveStoreString,
  testResolveStoreInstance,
  testBaseStoreThrows,
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
