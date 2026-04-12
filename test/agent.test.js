/**
 * Agent tests — core queue/send/ask mechanics, hooks, compaction, parsing.
 *
 * Uses a mock provider that returns predictable responses.
 */
import { strict as assert } from 'assert';
import { Agent } from '../agent.js';
import { registry } from '../providers/index.js';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ─── Mock Provider ──────────────────────────────────────────────────────────

class MockProvider {
  constructor() { this.sessions = new Map(); this.calls = []; }
  async createSession(id, sp) { this.sessions.set(id, { systemPrompt: sp }); }
  async destroySession(id) { this.sessions.delete(id); }
  hasSession(id) { return this.sessions.has(id); }
  getSession(id) { return this.sessions.get(id); }
  async send(id, model, messages, opts) {
    const lastMsg = messages[messages.length - 1]?.content || '';
    this.calls.push({ id, model, messages, opts });
    return { text: `response to: ${lastMsg.substring(0, 50)}`, usage: { input: 10, output: 5, cached: 0 } };
  }
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

let tmpDir;
let provider;

function setup() {
  tmpDir = mkdtempSync(join(tmpdir(), 'chorus-test-'));
  provider = new MockProvider();
  registry.clear();
  registry.register('mock', provider, 'mock-model');
}

function teardown() {
  rmSync(tmpDir, { recursive: true, force: true });
  registry.clear();
}

function createAgent(id, prompt, opts = {}) {
  return new Agent(id, prompt, { model: 'mock', dataDir: tmpDir, ...opts });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

async function testAskQueuesAndSends() {
  setup();
  const agent = createAgent('a1', 'You are helpful.');
  const response = await agent.ask('Hello');
  assert(response.includes('response to:'), 'ask() should return LLM response');
  assert.equal(provider.calls.length, 1, 'ask() should make exactly one LLM call');
  assert.equal(agent.messageCount, 2, 'should have user + assistant messages');
  teardown();
}

async function testQueueDoesNotCallLLM() {
  setup();
  const agent = createAgent('a2', 'You are helpful.');
  agent.queue('message 1');
  agent.queue('message 2');
  assert.equal(provider.calls.length, 0, 'queue() should not call LLM');
  assert.equal(agent.messageCount, 2, 'should have 2 queued messages');
  teardown();
}

async function testSendFlushesQueue() {
  setup();
  const agent = createAgent('a3', 'You are helpful.');
  agent.queue('context 1');
  agent.queue('context 2');
  const response = await agent.send();
  assert(response.includes('response to:'), 'send() should return LLM response');
  assert.equal(provider.calls.length, 1, 'send() should make one LLM call');
  // Provider should see merged queued messages (consecutive user msgs merge into one)
  const msgs = provider.calls[0].messages;
  assert(msgs.length >= 1, 'LLM should see queued messages');
  assert(msgs[0].content.includes('context 1'), 'should contain first queued message');
  teardown();
}

async function testMergeConsecutive() {
  const merged = Agent.mergeConsecutive([
    { role: 'user', content: 'a' },
    { role: 'user', content: 'b' },
    { role: 'assistant', content: 'c' },
    { role: 'user', content: 'd' },
  ]);
  assert.equal(merged.length, 3, 'consecutive same-role should merge');
  assert.equal(merged[0].content, 'a\nb', 'merged content should join with newline');
  assert.equal(merged[1].content, 'c');
  assert.equal(merged[2].content, 'd');
}

async function testParseJSON() {
  // Clean JSON
  assert.deepEqual(Agent.parseJSON('{"a":1}'), { a: 1 });

  // JSON in markdown
  assert.deepEqual(
    Agent.parseJSON('Here is the result: ```json\n{"name":"test"}\n```'),
    { name: 'test' }
  );

  // Mixed text with JSON
  assert.deepEqual(
    Agent.parseJSON('The answer is {"score": 42, "label": "good"} and more text'),
    { score: 42, label: 'good' }
  );

  // No JSON
  assert.equal(Agent.parseJSON('no json here'), null);
}

async function testHooksBeforeSend() {
  setup();
  const agent = createAgent('a4', 'You are helpful.');
  let hookCalled = false;
  agent.hook('beforeSend', (msgs) => {
    hookCalled = true;
    return [...msgs, { role: 'user', content: 'injected' }];
  });
  await agent.ask('Hello');
  assert(hookCalled, 'beforeSend hook should be called');
  // Check that injected message was in the call
  const msgs = provider.calls[0].messages;
  assert(msgs.some(m => m.content === 'injected'), 'hook should inject message');
  teardown();
}

async function testHooksAfterSend() {
  setup();
  const agent = createAgent('a5', 'You are helpful.');
  agent.hook('afterSend', (text) => text.toUpperCase());
  const response = await agent.ask('Hello');
  assert.equal(response, response.toUpperCase(), 'afterSend hook should modify response');
  teardown();
}

async function testHooksGovernance() {
  setup();
  const agent = createAgent('a6', 'You are helpful.');
  agent.hook('governance', (ctx) => {
    if (ctx.usage.calls > 0) throw new Error('Budget exceeded');
  });
  // First call should work
  await agent.ask('Hello');
  // Second call should be blocked by governance
  try {
    await agent.ask('Again');
    assert.fail('should have thrown');
  } catch (e) {
    assert(e.message.includes('Budget exceeded'), 'governance hook should block');
  }
  teardown();
}

async function testBeforeQueueSuppress() {
  setup();
  const agent = createAgent('a7', 'You are helpful.');
  agent.hook('beforeQueue', (content) => {
    if (content.includes('secret')) return null; // suppress
    return content;
  });
  agent.queue('normal message');
  agent.queue('this is secret');
  assert.equal(agent.messageCount, 1, 'suppressed message should not be queued');
  teardown();
}

async function testPin() {
  setup();
  const agent = createAgent('a8', 'You are helpful.');
  agent.pin('Always remember this.');
  agent.queue('normal message');
  assert.equal(agent.messageCount, 2, 'pin should add a message');
  teardown();
}

async function testCompact() {
  setup();
  const agent = createAgent('a9', 'You are helpful.');
  // Add enough messages to compact
  for (let i = 0; i < 50; i++) {
    agent.queue(`message ${i}`);
  }
  await agent.compact(
    async (oldMessages) => `Summary of ${oldMessages.length} messages`,
    10
  );
  // After compaction, should have fewer messages
  assert(agent.messageCount < 50, 'compaction should reduce message count');
  teardown();
}

async function testTotalUsage() {
  setup();
  const agent = createAgent('a10', 'You are helpful.');
  await agent.ask('Hello');
  await agent.ask('World');
  const usage = agent.totalUsage;
  assert.equal(usage.calls, 2, 'should track 2 calls');
  assert.equal(usage.input, 20, 'should accumulate input tokens');
  assert.equal(usage.output, 10, 'should accumulate output tokens');
  teardown();
}

async function testObjectConstructor() {
  setup();
  const agent = new Agent({
    id: 'obj-test',
    systemPrompt: 'You are helpful.',
    model: 'mock',
    dataDir: tmpDir,
  });
  const response = await agent.ask('Hello');
  assert(response.includes('response to:'), 'object constructor should work');
  assert.equal(agent.id, 'obj-test');
  assert.equal(agent.systemPrompt, 'You are helpful.');
  teardown();
}

async function testReset() {
  setup();
  const agent = createAgent('a11', 'You are helpful.');
  agent.queue('message 1');
  agent.queue('message 2');
  assert.equal(agent.messageCount, 2);
  agent.reset();
  assert.equal(agent.messageCount, 0, 'reset should clear all messages');
  teardown();
}

async function testMaxCalls() {
  setup();
  const agent = createAgent('a12', 'You are helpful.', { maxCalls: 2 });
  await agent.ask('call 1');
  await agent.ask('call 2');
  const response = await agent.ask('call 3');
  assert(response.includes('LIMIT'), 'should return limit message after maxCalls');
  assert.equal(provider.calls.length, 2, 'should not make LLM call after limit');
  teardown();
}

// ─── Run ────────────────────────────────────────────────────────────────────

const tests = [
  testAskQueuesAndSends,
  testQueueDoesNotCallLLM,
  testSendFlushesQueue,
  testMergeConsecutive,
  testParseJSON,
  testHooksBeforeSend,
  testHooksAfterSend,
  testHooksGovernance,
  testBeforeQueueSuppress,
  testPin,
  testCompact,
  testTotalUsage,
  testObjectConstructor,
  testReset,
  testMaxCalls,
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
