async function testAuth() {
  const baseUrl = 'http://localhost:3000/auth';
  const testUser = {
    email: 'test@example.com',
    password: 'password123',
    ircNick: 'TestUser'
  };

  console.log('--- Testing Registration ---');
  try {
    const regRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    const regData = await regRes.json();
    console.log('Registration Status:', regRes.status);
    console.log('Registration Data:', regData);

    if (regRes.status !== 201) throw new Error('Registration failed');

    console.log('\n--- Testing Login ---');
    const loginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email, password: testUser.password })
    });
    const loginData = await loginRes.json();
    console.log('Login Status:', loginRes.status);
    console.log('Login Data:', loginData);

    if (loginRes.status !== 200) throw new Error('Login failed');
    console.log('\nAuth tests passed successfully!');

  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

testAuth();
