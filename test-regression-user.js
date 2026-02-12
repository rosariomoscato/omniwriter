const crypto = require('crypto');

function generateUniqueEmail() {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `regression-test-${timestamp}-${random}@omniwriter.test`;
}

async function testCreateUser() {
  const email = generateUniqueEmail();
  const password = 'Test123456!';
  const name = 'Regression Test User';

  console.log('Creating test user with email:', email);

  const response = await fetch('http://localhost:3001/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  });

  const result = await response.json();

  if (response.ok) {
    console.log('✓ User created successfully');
    console.log('  User ID:', result.user.id);
    console.log('  Email:', result.user.email);

    // Save email to file for verification after restart
    require('fs').writeFileSync('/tmp/regression-test-email.txt', email);
    console.log('\nEmail saved to /tmp/regression-test-email.txt for verification after restart');
    process.exit(0);
  } else {
    console.log('✗ Failed to create user:', result.error);
    process.exit(1);
  }
}

testCreateUser().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
