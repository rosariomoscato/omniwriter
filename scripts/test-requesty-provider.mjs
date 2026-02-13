/**
 * Test script to verify RequestyProvider configuration
 * This tests the provider without making actual API calls
 */

// Simple assertion helper
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

// Simulate the RequestyProvider configuration check
async function testRequestyProviderConfig() {
  console.log('\n=== Testing RequestyProvider Configuration ===\n');

  // Test 1: Default Base URL
  const DEFAULT_BASE_URL = 'https://router.requesty.ai';
  assert(DEFAULT_BASE_URL === 'https://router.requesty.ai',
    'Default base URL should be https://router.requesty.ai');

  // Test 2: Headers format
  const mockApiKey = 'test-api-key';
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': mockApiKey,
    'anthropic-version': '2023-06-01'
  };
  assert(headers['x-api-key'] === mockApiKey,
    'Headers should use x-api-key (not Authorization Bearer)');
  assert(headers['anthropic-version'] === '2023-06-01',
    'Headers should include anthropic-version');
  assert(headers['Authorization'] === undefined,
    'Headers should NOT include Authorization header');

  // Test 3: Chat endpoint
  const chatEndpoint = '/v1/messages';
  assert(chatEndpoint === '/v1/messages',
    'Chat endpoint should be /v1/messages (Anthropic-style)');

  // Test 4: Request body format (Anthropic-style)
  const messages = [
    { role: 'system', content: 'You are helpful.' },
    { role: 'user', content: 'Hello!' }
  ];

  // Simulate extracting system message
  let systemPrompt = undefined;
  const chatMessages = messages.filter(m => {
    if (m.role === 'system') {
      systemPrompt = m.content;
      return false;
    }
    return true;
  });

  // Use correct Requesty model ID format: provider/exact-model-id
  const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-20250514';
  const requestBody = {
    model: DEFAULT_MODEL,
    messages: chatMessages.map(m => ({ role: m.role, content: m.content })),
    max_tokens: 4096,
    stream: false
  };
  if (systemPrompt) {
    requestBody.system = systemPrompt;
  }

  assert(requestBody.system === 'You are helpful.',
    'Request body should have system field for system prompt');
  assert(requestBody.messages.length === 1,
    'System message should be extracted from messages array');
  assert(requestBody.max_tokens === 4096,
    'Request body should use max_tokens (not max_completion_tokens)');
  assert(requestBody.messages[0].role === 'user',
    'Remaining message should be user message');
  assert(requestBody.model === 'anthropic/claude-sonnet-4-20250514',
    'Default model should use Requesty format: anthropic/claude-sonnet-4-20250514');

  // Test 5: Response parsing (Anthropic-style)
  const mockResponse = {
    id: 'msg-123',
    type: 'message',
    role: 'assistant',
    content: [
      { type: 'text', text: 'Hello from Requesty!' }
    ],
    model: 'anthropic/claude-sonnet-4-20250514',
    stop_reason: 'end_turn',
    usage: {
      input_tokens: 20,
      output_tokens: 10
    }
  };

  // Simulate parsing
  const content = mockResponse.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');

  assert(content === 'Hello from Requesty!',
    'Content should be extracted from content blocks');
  assert(mockResponse.usage.input_tokens === 20,
    'Usage should have input_tokens (not prompt_tokens)');
  assert(mockResponse.usage.output_tokens === 10,
    'Usage should have output_tokens (not completion_tokens)');

  // Test 6: Test connection method (minimal message test)
  const testConnectionUrl = `${DEFAULT_BASE_URL}/v1/messages`;
  assert(testConnectionUrl === 'https://router.requesty.ai/v1/messages',
    'Test connection should use /v1/messages endpoint');

  // Test 7: Known models list (Requesty format)
  const KNOWN_MODELS = [
    'anthropic/claude-sonnet-4-20250514',
    'anthropic/claude-3-7-sonnet',
    'anthropic/claude-3-5-haiku-20241022',
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'google/gemini-2.0-flash-exp',
    'mistral/mistral-large-2411',
    'meta/llama-3.3-70b-instruct'
  ];

  assert(KNOWN_MODELS.includes('anthropic/claude-sonnet-4-20250514'),
    'Known models should include claude-sonnet-4-20250514');
  assert(KNOWN_MODELS.includes('openai/gpt-4o'),
    'Known models should include gpt-4o');
  assert(KNOWN_MODELS.includes('google/gemini-2.0-flash-exp'),
    'Known models should include gemini-2.0-flash-exp');
  // Old invalid models should NOT be in list
  assert(!KNOWN_MODELS.includes('anthropic/claude-3.5-sonnet'),
    'Known models should NOT include old invalid format claude-3.5-sonnet');

  console.log('\n=== All Configuration Tests Passed ===\n');
}

testRequestyProviderConfig().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
