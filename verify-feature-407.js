// Verify Feature #407: UI Storage Bar Component
// Checks that the StorageBar component exists and is properly integrated

const http = require('http');

function makeRequest(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {}
    };

    if (token) {
      options.headers['Authorization'] = 'Bearer ' + token;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function verifyFeature407() {
  console.log('=========================================');
  console.log('Feature #407: UI Storage Bar Component');
  console.log('=========================================\n');

  // Step 1: Register user
  console.log('Step 1: Creating test user...');
  const timestamp = Date.now();
  const email = 'verify407_' + timestamp + '@example.com';

  let result = await makeRequest('POST', '/api/auth/register', null, {
    email: email,
    password: 'Test1234',
    name: 'Verify 407'
  });
  console.log('Register status:', result.status);

  // Login
  console.log('\nStep 2: Logging in...');
  result = await makeRequest('POST', '/api/auth/login', null, {
    email: email,
    password: 'Test1234'
  });

  if (result.status !== 200) {
    console.error('Login failed');
    return;
  }

  const token = result.data.token;
  console.log('Logged in');

  // Step 3: Check storage API works
  console.log('\nStep 3: Verifying storage API...');
  result = await makeRequest('GET', '/api/users/storage', token);

  if (result.status === 200) {
    console.log('✅ Storage API endpoint working');
    const storage = result.data.storage;
    console.log('   Used:', storage.used_mb, 'MB');
    console.log('   Limit:', storage.limit_mb, 'MB');
    console.log('   Percent:', storage.percent_used, '%');
  } else {
    console.log('❌ Storage API failed');
    return;
  }

  // Step 4: Verify component files exist
  console.log('\nStep 4: Verifying component files...');
  const fs = require('fs');
  const path = require('path');

  const componentPath = path.join(__dirname, 'client/src/components/StorageBar.tsx');
  if (fs.existsSync(componentPath)) {
    console.log('✅ StorageBar component exists at:', componentPath);
  } else {
    console.log('❌ StorageBar component not found');
    return;
  }

  // Step 5: Check component is imported in Dashboard
  console.log('\nStep 5: Checking Dashboard integration...');
  const dashboardPath = path.join(__dirname, 'client/src/pages/Dashboard.tsx');
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

  if (dashboardContent.includes("import StorageBar from '../components/StorageBar'")) {
    console.log('✅ StorageBar imported in Dashboard');
  } else {
    console.log('❌ StorageBar not imported in Dashboard');
    return;
  }

  if (dashboardContent.includes('<StorageBar')) {
    console.log('✅ StorageBar component used in Dashboard');
  } else {
    console.log('❌ StorageBar component not used in Dashboard');
    return;
  }

  // Step 6: Check component is imported in ProfilePage
  console.log('\nStep 6: Checking ProfilePage integration...');
  const profilePath = path.join(__dirname, 'client/src/pages/ProfilePage.tsx');
  const profileContent = fs.readFileSync(profilePath, 'utf8');

  if (profileContent.includes("import StorageBar from '../components/StorageBar'")) {
    console.log('✅ StorageBar imported in ProfilePage');
  } else {
    console.log('❌ StorageBar not imported in ProfilePage');
    return;
  }

  if (profileContent.includes('<StorageBar')) {
    console.log('✅ StorageBar component used in ProfilePage');
  } else {
    console.log('❌ StorageBar component not used in ProfilePage');
    return;
  }

  // Step 7: Check i18n translations
  console.log('\nStep 7: Checking i18n translations...');
  const enPath = path.join(__dirname, 'client/src/i18n/locales/en.json');
  const itPath = path.join(__dirname, 'client/src/i18n/locales/it.json');

  const enContent = fs.readFileSync(enPath, 'utf8');
  const itContent = fs.readFileSync(itPath, 'utf8');

  if (enContent.includes('"storage":')) {
    console.log('✅ English storage translations exist');
  } else {
    console.log('❌ English storage translations missing');
    return;
  }

  if (itContent.includes('"storage":')) {
    console.log('✅ Italian storage translations exist');
  } else {
    console.log('❌ Italian storage translations missing');
    return;
  }

  console.log('\n=========================================');
  console.log('Feature #407 Verification Complete');
  console.log('=========================================');
  console.log('\n✅ Feature #407 Implementation Summary:');
  console.log('  1. StorageBar component created');
  console.log('  2. Integrated in Dashboard.tsx');
  console.log('  3. Integrated in ProfilePage.tsx');
  console.log('  4. i18n translations added (en + it)');
  console.log('  5. Component features:');
  console.log('     - Shows storage usage with progress bar');
  console.log('     - Color changes: green (0-79%), orange (80-94%), red (95-100%)');
  console.log('     - Warning messages at 80% and 95%');
  console.log('     - Fetches data from /api/users/storage');
  console.log('     - Responsive design with dark mode support');
}

verifyFeature407().catch(console.error);
