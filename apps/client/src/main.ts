import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { io, Socket } from 'socket.io-client';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let socket: Socket | null = null;
let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// --- IPC Handlers ---

ipcMain.handle('irc:connect', (event, { userId, config }) => {
  if (socket) socket.disconnect();

  socket = io('http://localhost:3000');

  socket.on('connect', () => {
    console.log('Connected to Gateway');
    socket.emit('irc:connect', { userId, config });
  });

  socket.on('irc:registered', () => {
    mainWindow?.webContents.send('irc:registered');
  });

  socket.on('irc:message', (msg) => {
    mainWindow?.webContents.send('irc:message', msg);
  });

  socket.on('irc:error', (err) => {
    mainWindow?.webContents.send('irc:error', err);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from Gateway');
  });
});

ipcMain.handle('irc:send-message', (event, { channel, message }) => {
  socket?.emit('irc:message', { channel, message });
});

ipcMain.handle('auth:register', async (event, data) => {
  const res = await fetch('http://localhost:3000/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return await res.json();
});

ipcMain.handle('auth:login', async (event, data) => {
  const res = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return await res.json();
});

ipcMain.handle('guilds:get-mine', async (event, userId) => {
  const res = await fetch(`http://localhost:3000/guilds/user/${userId}`);
  return await res.json();
});

ipcMain.handle('guilds:get-channels', async (event, guildId) => {
  const res = await fetch(`http://localhost:3000/guilds/${guildId}/channels`);
  return await res.json();
});

// --- Lifecycle ---

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
