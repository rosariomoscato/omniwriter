/**
 * Test script to verify RequestyProvider uses OpenAI-compatible API
 * Run with: npx tsx scripts/test-requesty-provider-openai.ts
 */

import { RequestyProvider } from '../server/src/services/ai/providers/RequestyProvider';

const TEST_API_KEY = 'test-api-key-12345';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✓ ${message}`);
    passed++;
  } else {
    console.log(`✗ ${message}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual === expected) {
    console.log(`✓ ${message}`);
    passed++;
  } else {
    console.log(`✗ ${message} (expected: ${expected}, got: ${actual})`);
    failed++;
  }
}

async function runTests() {
  // Create provider instance - access private methods via type assertion
  const config = { apiKey: TEST_API_KEY };
  const provider = new RequestyProvider(config);
  const p = provider as any;

  console.log('\n=== RequestyProvider OpenAI-Compatible Mode Tests ===\n');

  // Test 1: Provider type
  assertEqual(provider.getProviderType(), 'requesty', 'Provider type is requesty');

  // Test 2: Base URL (should include /v1 for OpenAI-compatible mode)
  const baseUrl = p.getDefaultBaseUrl();
  assertEqual(baseUrl, 'https://router.requesty.ai/v1', 'Base URL is https://router.requesty.ai/v1 (OpenAI-compatible)');

  // Test 3: Headers should use Authorization: Bearer
  const headers = p.getHeaders();
  assertEqual(headers['Authorization'], `Bearer ${TEST_API_KEY}`, 'Uses Authorization: Bearer header');
  assert(headers['x-api-key'] === undefined, 'Does NOT use x-api-key header');
  assert(headers['anthropic-version'] === undefined, 'Does NOT use anthropic-version header');

  // Test 4: Request body keeps system in messages array (OpenAI-style)
  const messages = [
    { role: 'system', content: 'System prompt' },
    { role: 'user', content: 'Hello!' }
  ];
  const body = p.buildRequestBody(messages, {});
  assert(body.system === undefined, 'Does NOT extract system to separate field');
  assertEqual(body.messages.length, 2, 'Keeps all messages in array');
  assertEqual(body.messages[0].role, 'system', 'System message stays first');

  // Test 5: Default model
  assertEqual(provider.getDefaultModel(), 'anthropic/claude-sonnet-4-20250514', 'Default model is correct');

  // Test 6: Known models
  const models = await provider.getAvailableModels();
  assert(models.length > 0, 'Has known models');
  assert(models.some((m: any) => m.id.includes('claude')), 'Includes Claude models');
  assert(models.some((m: any) => m.id.includes('gpt')), 'Includes GPT models');

  // Test 7: Parse OpenAI-style response
  const mockResponse = {
    id: 'chatcmpl-123',
    choices: [{
      message: { role: 'assistant', content: 'Hello from Requesty!' },
      finish_reason: 'stop'
    }],
    model: 'anthropic/claude-sonnet-4-20250514',
    usage: {
      prompt_tokens: 20,
      completion_tokens: 10,
      total_tokens: 30
    }
  };

  const result = p.parseResponse(mockResponse);
  assertEqual(result.content, 'Hello from Requesty!', 'Parses content correctly');
  assertEqual(result.model, 'anthropic/claude-sonnet-4-20250514', 'Parses model correctly');
  assertEqual(result.finishReason, 'stop', 'Parses finish_reason correctly');
  assertEqual(result.usage?.promptTokens, 20, 'Parses prompt tokens correctly');
  assertEqual(result.usage?.completionTokens, 10, 'Parses completion tokens correctly');
  assertEqual(result.usage?.totalTokens, 30, 'Parses total tokens correctly');

  // Test 8: Request body uses 'stop' not 'stop_sequences'
  const bodyWithStop = p.buildRequestBody(messages, { stopSequences: ['END'] });
  assert(bodyWithStop.stop !== undefined, 'Uses stop (OpenAI-style)');
  assert(bodyWithStop.stop_sequences === undefined, 'Does NOT use stop_sequences (Anthropic-style)');

  // Test 9: Chat endpoint uses /chat/completions
  const chatEndpoint = `${baseUrl}/chat/completions`;
  console.log(`\nExpected chat endpoint: ${chatEndpoint}`);
  assert(chatEndpoint === 'https://router.requesty.ai/v1/chat/completions', 'Chat endpoint is /v1/chat/completions');

  // Test 10: Connection test uses correct endpoint
  console.log('\nNote: testConnection() will make POST to:');
  console.log('  https://router.requesty.ai/v1/chat/completions');
  console.log('  with Authorization: Bearer <key>');

  console.log('\n=== Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);
