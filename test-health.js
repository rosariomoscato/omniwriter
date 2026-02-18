const http = require('http');

http.get('http://127.0.0.1:4000/api/health', (res) => {
  let data = '';
  res.on('data', (d) => {
    data += d;
  });
  res.on('end', () => {
    console.log(data);
  });
}).on('error', (e) => {
  console.error(`Error: ${e.message}`);
});
