const fs = require('fs');

async function testPersistence() {
  const timestamp = Date.now();
  const testEmail = `persistence_test_${timestamp}@test.com`;

  console.log('Creating test user:', testEmail);

  const response = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      email: testEmail,
      password: 'TestPass123!',
      name: 'Persistence Test User'
    })
  });

  const result = await response.json();
  console.log('Response:', JSON.stringify(result, null, 2));

  // Save email for later verification
  fs.writeFileSync('/tmp/persistence_test_email.txt', testEmail);
  console.log('Saved test email to /tmp/persistence_test_email.txt');

  return { email: testEmail, result };
}

testPersistence().catch(console.error);
