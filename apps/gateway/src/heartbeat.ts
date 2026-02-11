import { IRCClient } from './irc-client';

const config = {
  host: 'localhost',
  port: 6667,
  nick: 'IronCordBot',
  username: 'ironcord',
  realname: 'IronCord Bridge',
  password: 'testpassword' // In a real app, this would be retrieved from DB
};

const client = new IRCClient(config);

client.on('registered', () => {
  console.log('Heartbeat: Successfully connected and registered!');
  // Keep connection open for a bit then disconnect
  setTimeout(() => {
    console.log('Heartbeat: Mission accomplished, disconnecting...');
    client.disconnect();
    process.exit(0);
  }, 5000);
});

client.on('error', (err) => {
  console.error('Heartbeat: Error encountered:', err);
  process.exit(1);
});

console.log('Heartbeat: Starting connection to IRC server...');
client.connect();
