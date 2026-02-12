const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/api/health',
  method: 'GET',
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response Body:');
    console.log(JSON.stringify(JSON.parse(data), null, 2));

    // Verify the health endpoint response
    const response = JSON.parse(data);
    if (response.status === 'healthy') {
      console.log('\n✅ Health check passed: Server is healthy');
      if (response.database && response.database.status === 'connected') {
        console.log('✅ Database check passed: Database is connected');
        console.log('\n🎉 Feature #1 PASSED: Database connection established');
      } else {
        console.log('\n❌ Database check failed: Database status is', response.database?.status);
      }
    } else {
      console.log('\n❌ Health check failed: Server status is', response.status);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error making request:', error.message);
  console.error('\n❌ Feature #1 FAILED: Cannot connect to server');
  process.exit(1);
});

req.end();
