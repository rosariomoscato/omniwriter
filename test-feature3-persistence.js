// Feature 3 Test: Data persists across server restart
var http = require('http');

var testEmail = 'persistence-test-' + Date.now() + '@test.com';
var testPassword = 'TestPass123!';
var testUserId = null;

function makeRequest(options, body) {
  return new Promise(function(resolve, reject) {
    var req = http.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  console.log('=== Feature 3: Data Persists Across Server Restart ===\n');

  // Step 1: Register a test user
  console.log('Step 1: Creating test user...');
  var registerData = JSON.stringify({
    email: testEmail,
    password: testPassword,
    name: 'Persistence Test User'
  });

  var registerRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(registerData)
    }
  }, null);

  // Need to send body differently
  var registerResult = await new Promise(function(resolve, reject) {
    var req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(registerData);
    req.end();
  });

  console.log('Register response:', JSON.stringify(registerResult));

  if (registerResult.status !== 201 && registerResult.status !== 200) {
    console.log('ERROR: Failed to create test user');
    process.exit(1);
  }

  testUserId = registerResult.body.user ? registerResult.body.user.id : 'unknown';
  console.log('✓ Test user created with email:', testEmail);

  // Step 2: Verify user can login
  console.log('\nStep 2: Verifying user can login...');

  var loginData = JSON.stringify({
    email: testEmail,
    password: testPassword
  });

  var loginResult = await new Promise(function(resolve, reject) {
    var req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });

  console.log('Login response status:', loginResult.status);

  if (loginResult.status !== 200) {
    console.log('ERROR: Login failed before restart');
    process.exit(1);
  }

  console.log('✓ User can login before restart');

  console.log('\n=== BEFORE RESTART: All steps passed ===');
  console.log('Test user email:', testEmail);
  console.log('Now STOP the server, RESTART it, and run the verification script.');
}

test().catch(console.error);
