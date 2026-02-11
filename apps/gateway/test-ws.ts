const { io } = require('socket.io-client');

async function testWebSocket() {
  const socket = io('http://localhost:3000');

  socket.on('connect', () => {
    console.log('Connected to WebSocket server');
    
    console.log('Requesting IRC connection...');
    socket.emit('irc:connect', {
      host: 'localhost',
      port: 6667,
      nick: 'WSTester',
      username: 'tester',
      realname: 'WS Tester',
      password: 'testpassword'
    });
  });

  socket.on('irc:registered', () => {
    console.log('IRC Bridge: Successfully registered via WebSocket!');
    socket.disconnect();
    process.exit(0);
  });

  socket.on('irc:error', (err: string) => {
    console.error('IRC Bridge Error:', err);
    process.exit(1);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from WebSocket server');
  });

  // Timeout
  setTimeout(() => {
    console.error('Test timed out');
    process.exit(1);
  }, 10000);
}

testWebSocket();
