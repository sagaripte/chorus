/**
 * Bus tests — pub/sub, wildcard, once, off.
 */
import { strict as assert } from 'assert';
import { Bus } from '../bus.js';

async function testOnAndEmit() {
  const bus = new Bus();
  let received = null;
  bus.on('test', (data) => { received = data; });
  bus.emit('test', { value: 42 });
  assert.deepEqual(received, { value: 42 });
}

async function testMultipleListeners() {
  const bus = new Bus();
  const results = [];
  bus.on('test', () => results.push('a'));
  bus.on('test', () => results.push('b'));
  bus.emit('test', {});
  assert.deepEqual(results, ['a', 'b']);
}

async function testWildcard() {
  const bus = new Bus();
  const events = [];
  bus.on('*', (event, data) => events.push({ event, data }));
  bus.emit('foo', 1);
  bus.emit('bar', 2);
  assert.equal(events.length, 2);
  assert.equal(events[0].event, 'foo');
  assert.equal(events[1].event, 'bar');
}

async function testOff() {
  const bus = new Bus();
  let count = 0;
  const handler = () => count++;
  bus.on('test', handler);
  bus.emit('test', {});
  bus.off('test', handler);
  bus.emit('test', {});
  assert.equal(count, 1, 'handler should not fire after off()');
}

async function testOffWildcard() {
  const bus = new Bus();
  let count = 0;
  const handler = () => count++;
  bus.on('*', handler);
  bus.emit('test', {});
  bus.off('*', handler);
  bus.emit('test', {});
  assert.equal(count, 1, 'wildcard handler should not fire after off()');
}

async function testOnce() {
  const bus = new Bus();
  let count = 0;
  bus.once('test', () => count++);
  bus.emit('test', {});
  bus.emit('test', {});
  bus.emit('test', {});
  assert.equal(count, 1, 'once() handler should fire exactly once');
}

async function testClear() {
  const bus = new Bus();
  let count = 0;
  bus.on('test', () => count++);
  bus.on('*', () => count++);
  bus.clear();
  bus.emit('test', {});
  assert.equal(count, 0, 'clear() should remove all listeners');
}

async function testChainable() {
  const bus = new Bus();
  const result = bus.on('test', () => {}).off('test', () => {});
  assert.equal(result, bus, 'on/off should return bus for chaining');
}

async function testNoListeners() {
  const bus = new Bus();
  // Should not throw
  bus.emit('nonexistent', { data: 'ignored' });
}

// ─── Run ────────────────────────────────────────────────────────────────────

const tests = [
  testOnAndEmit,
  testMultipleListeners,
  testWildcard,
  testOff,
  testOffWildcard,
  testOnce,
  testClear,
  testChainable,
  testNoListeners,
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
