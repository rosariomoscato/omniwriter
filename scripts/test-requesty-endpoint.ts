/**
 * Test script to verify Requesty API endpoint configuration
 * This tests the actual API call to verify:
 * 1. Base URL is correct: https://router.requesty.ai/v1
 * 2. Endpoint is correct: /chat/completions
 * 3. Auth header is correct: Authorization: Bearer
 */

import { RequestyProvider } from '../server/src/services/ai/providers/RequestyProvider';

async function testRequestyEndpoint() {
  console.log('\n=== Testing Requesty API Endpoint Configuration ===\n');

  // Use a fake key - we just want to verify the URL/header format
  const provider = new RequestyProvider({ apiKey: 'test-fake-key-12345' });
  const p = provider as any;

  // Test 1: Verify base URL
  const baseUrl = p.getDefaultBaseUrl();
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Expected: https://router.requesty.ai/v1`);
  console.log(`Match: ${baseUrl === 'https://router.requesty.ai/v1'}\n`);

  // Test 2: Verify headers
  const headers = p.getHeaders();
  console.log(`Headers:`);
  console.log(`  Authorization: ${headers['Authorization']}`);
  console.log(`  x-api-key: ${headers['x-api-key'] || 'NOT SET'}`);
  console.log(`Expected Authorization: Bearer test-fake-key-12345`);
  console.log(`Match: ${headers['Authorization'] === 'Bearer test-fake-key-12345'}\n`);

  // Test 3: Verify endpoint
  const fullEndpoint = `${baseUrl}/chat/completions`;
  console.log(`Full endpoint: ${fullEndpoint}`);
  console.log(`Expected: https://router.requesty.ai/v1/chat/completions`);
  console.log(`Match: ${fullEndpoint === 'https://router.requesty.ai/v1/chat/completions'}\n`);

  // Test 4: Verify request body format (OpenAI-style)
  const messages = [
    { role: 'system', content: 'You are helpful.' },
    { role: 'user', content: 'Hi' }
  ];
  const body = p.buildRequestBody(messages, { maxTokens: 10 });
  console.log(`Request body:`);
  console.log(JSON.stringify(body, null, 2));
  console.log(`Expected: messages array with 2 items (system NOT extracted)`);
  console.log(`Messages count: ${body.messages.length}`);
  console.log(`System in messages: ${body.messages[0].role === 'system'}`);
  console.log(`Body.system: ${body.system || 'NOT SET'}\n`);

  // Test 5: Actually make the API call to see what error we get
  // With wrong API key, we should get 401 (Unauthorized), not 404 (Not Found)
  console.log(`Making test API call to verify endpoint...`);
  try {
    const response = await fetch(fullEndpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    console.log(`Response status: ${response.status}`);
    console.log(`Response status text: ${response.statusText}`);

    const responseText = await response.text();
    console.log(`Response body: ${responseText.substring(0, 500)}...`);

    if (response.status === 404) {
      console.log(`\n❌ ERROR: Got 404 - endpoint not found!`);
      console.log(`This means the URL is wrong.`);
    } else if (response.status === 401) {
      console.log(`\n✅ SUCCESS: Got 401 - endpoint exists, auth failed as expected.`);
      console.log(`The endpoint URL is correct!`);
    } else {
      console.log(`\n⚠️ Got ${response.status} - unexpected response`);
    }
  } catch (error) {
    console.log(`\nNetwork error: ${error}`);
  }

  console.log('\n=== Summary ===');
  console.log(`Base URL: ${baseUrl === 'https://router.requesty.ai/v1' ? '✅ Correct' : '❌ Wrong'}`);
  console.log(`Auth Header: ${headers['Authorization']?.startsWith('Bearer ') ? '✅ Correct' : '❌ Wrong'}`);
  console.log(`Endpoint: ${fullEndpoint === 'https://router.requesty.ai/v1/chat/completions' ? '✅ Correct' : '❌ Wrong'}`);
  console.log(`Request Format: ${body.messages.length === 2 && !body.system ? '✅ OpenAI-style' : '❌ Wrong'}`);
}

testRequestyEndpoint().catch(console.error);
