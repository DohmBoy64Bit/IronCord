import io from 'socket.io-client';

const API_URL = 'http://localhost:3000';
const WS_URL = 'http://localhost:3000';

async function runTest() {
  console.log('🚀 Starting Comprehensive System Test...');

  const testEmail = `test_${Date.now()}@example.com`;
  const testPass = 'password123';
  const testNick = `tester_${Math.floor(Math.random() * 1000)}`;

  try {
    // 1. Register
    console.log('\n1. Registering new user...');
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPass, irc_nick: testNick }),
    });
    const regData = await regRes.json() as any;
    if (!regData.success) throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
    console.log('✅ Registered:', regData.user.email);
    const userId = regData.user.id;
    const token = regData.token;

    // 2. Login
    console.log('\n2. Logging in...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPass }),
    });
    const loginData = await loginRes.json() as any;
    if (!loginData.success) throw new Error('Login failed');
    console.log('✅ Logged in, received token');

    // 3. Create Guild
    console.log('\n3. Creating a Guild...');
    const guildRes = await fetch(`${API_URL}/guilds`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: `Test Server ${Date.now()}`, ownerId: userId }),
    });
    const guildData = await guildRes.json() as any;
    if (!guildData.id) throw new Error(`Guild creation failed: ${JSON.stringify(guildData)}`);
    console.log('✅ Guild created:', guildData.name);
    const guildId = guildData.id;

    // 4. Create Channel
    console.log('\n4. Creating a Channel...');
    const chanRes = await fetch(`${API_URL}/guilds/${guildId}/channels`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: 'general' }),
    });
    const chanData = await chanRes.json() as any;
    if (!chanData.id) throw new Error(`Channel creation failed: ${JSON.stringify(chanData)}`);
    console.log('✅ Channel created:', chanData.name, '(IRC:', chanData.irc_channel_name, ')');
    const ircChannel = chanData.irc_channel_name;

    // 5. Connect via WebSocket
    console.log('\n5. Connecting via WebSocket...');
    const socket = io(WS_URL, {
      auth: { token }
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WS connection timeout')), 5000);
      
      socket.on('connect', () => {
        console.log('✅ WebSocket Connected');
        clearTimeout(timeout);
        resolve();
      });

      socket.on('connect_error', (err: any) => {
        reject(err);
      });
    });

    // 6. Connect to IRC
    console.log('\n6. Connecting Bridge to IRC...');
    socket.emit('irc:connect', {
      userId,
      config: { host: 'localhost', port: 6667, nick: testNick }
    });

    await new Promise<void>((resolve) => {
      socket.on('irc:registered', () => {
        console.log('✅ IRC Registered');
        resolve();
      });
    });

    // 7. Send Message
    console.log('\n7. Sending test message...');
    socket.emit('irc:send-message', {
      channel: ircChannel,
      message: 'Hello from automated system test!'
    });

    // 8. Listen for incoming messages
    socket.on('irc:message', (msg: any) => {
      console.log(`📩 Received Message: [${msg.channel}] <${msg.author}> ${msg.content}`);
    });

    await new Promise(r => setTimeout(r, 2000));
    console.log('✅ Message sequence complete');

    // Cleanup
    socket.disconnect();
    console.log('\n🎉 All tests passed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTest();
