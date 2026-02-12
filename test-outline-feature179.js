const http = require('http');

// Test data
const testProject = {
  title: 'Test Novel for Outline',
  description: 'A test novel to verify outline generation',
  area: 'romanziere',
  genre: 'fantasy',
  tone: 'dark',
  target_audience: 'adulti',
  pov: 'terza persona',
  word_count_target: 50000
};

// Step 1: Create project
console.log('Step 1: Creating Romanziere project...');

const createProjectOptions = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/projects',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': JSON.stringify(testProject).length
  }
};

let projectId = null;
const createReq = http.request(createProjectOptions, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    const response = JSON.parse(body);
    if (response.project) {
      projectId = response.project.id;
      console.log('Project created with ID:', projectId);
      testOutlineGeneration(projectId);
    } else {
      console.error('Failed to create project:', body);
    }
  });
});

createReq.on('error', (e) => {
  console.error('Create project error:', e.message);
});

// Need to get the token first by logging in
const loginData = JSON.stringify({
  email: 'feature179@test.com',
  password: 'Test123456!'
});

const loginOptions = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

const loginReq = http.request(loginOptions, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    try {
      const response = JSON.parse(body);
      if (response.token) {
        console.log('Logged in successfully');

        // Now create project with auth
        createProjectOptions.headers['Authorization'] = `Bearer ${response.token}`;
        createReq.write(JSON.stringify(testProject));
        createReq.end();
      } else {
        console.error('Login failed:', body);
      }
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });
});

loginReq.on('error', (e) => {
  console.error('Login request error:', e.message);
});

loginReq.write(loginData);
loginReq.end();

function testOutlineGeneration(pid) {
  console.log('Step 2: Generating outline for project:', pid);

  const outlineOptions = {
    hostname: 'localhost',
    port: 3001,
    path: `/api/projects/${pid}/generate/outline`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': 0
    }
  };

  const outlineReq = http.request(outlineOptions, (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      console.log('Outline generation response:', body);
      try {
        const response = JSON.parse(body);
        if (response.outline) {
          console.log('SUCCESS: Outline generated with', response.outline.total_chapters, 'chapters');
          console.log('Chapters created:', response.created);
          response.outline.chapters.forEach((ch, i) => {
            console.log(`  ${i + 1}. ${ch.title} - ${ch.summary.substring(0, 50)}...`);
          });
        } else {
          console.log('Response:', response);
        }
      } catch (e) {
        console.error('Parse error:', e.message);
      }
    });
  });

  outlineReq.on('error', (e) => {
    console.error('Outline generation error:', e.message);
  });

  outlineReq.end();
}
