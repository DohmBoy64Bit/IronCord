const { io } = require('socket.io-client');

async function runSystemTest() {
  const apiBase = 'http://localhost:3000';
  const timestamp = Date.now();
  const testUser = {
    email: `dev-${timestamp}@ironcord.local`,
    password: 'password123',
    ircNick: `DevUser${timestamp % 1000}`
  };

  try {
    console.log('--- 1. Testing Registration ---');
    const regRes = await fetch(`${apiBase}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    const { user, token } = await regRes.json();
    console.log('User registered:', user.id);

    console.log('\n--- 2. Testing Guild Creation ---');
    const guildRes = await fetch(`${apiBase}/guilds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Test Guild ${timestamp % 1000}`, ownerId: user.id })
    });
    if (!guildRes.ok) {
      console.error('Guild Creation Failed:', await guildRes.text());
      process.exit(1);
    }
    const guild = await guildRes.json();
    console.log('Guild created:', guild.name, 'Prefix:', guild.irc_namespace_prefix);

    console.log('\n--- 3. Testing Channel Creation ---');
    const chanRes = await fetch(`${apiBase}/guilds/${guild.id}/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'General', topic: 'Main channel' })
    });
    if (!chanRes.ok) {
      console.error('Channel Creation Failed:', await chanRes.text());
      process.exit(1);
    }
    const channel = await chanRes.json();
    console.log('Channel created:', channel.name, 'IRC:', channel.irc_channel_name);

    console.log('\n--- 4. Testing WebSocket & Auto-Join ---');
    const socket = io(apiBase);

    socket.on('connect', () => {
      console.log('WS Connected, sending irc:connect...');
      socket.emit('irc:connect', {
        userId: user.id,
        config: {
          host: 'localhost',
          port: 6667,
          nick: testUser.ircNick,
          username: 'ironcord',
          realname: 'IronCord Tester',
          password: 'password123'
        }
      });
    });

    socket.on('irc:registered', () => {
      console.log('IRC Registered! (Check server logs for auto-join messages)');
      
      // Wait a bit for auto-join to finish then send a message
      setTimeout(() => {
        console.log(`\n--- 5. Testing Message Routing to ${channel.irc_channel_name} ---`);
        socket.emit('irc:message', {
          channel: channel.irc_channel_name,
          message: 'Hello from System Test!'
        });
      }, 2000);
    });

    socket.on('irc:message', (msg: any) => {
      console.log('RECEIVED IRC MESSAGE:', msg);
      if (msg.author === testUser.ircNick && msg.content === 'Hello from System Test!') {
        console.log('\n✅ Loopback message test PASSED!');
        socket.disconnect();
        process.exit(0);
      }
    });

    setTimeout(() => {
      console.error('Test Timed Out');
      process.exit(1);
    }, 15000);

  } catch (err) {
    console.error('System Test FAILED:', err);
    process.exit(1);
  }
}

runSystemTest();
