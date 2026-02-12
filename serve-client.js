const http = require('http');
const fs = require('fs');
const path = require('path');

const dir = '/Users/rosario/CODICE/omniwriter/client/dist';

const server = http.createServer((req, res) => {
  const filePath = path.join(dir, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const contentType = ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : 'text/html';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(3000, () => console.log('Server running on port 3000'));
