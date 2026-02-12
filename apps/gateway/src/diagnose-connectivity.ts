/**
 * IronCord Tri-Layer Connectivity Diagnostic Script
 * 
 * Tests both layers simultaneously:
 *   1. TCP → IRC Server (default localhost:6667)
 *   2. Socket.IO → Gateway (default localhost:3000)
 * 
 * Usage:
 *   npx ts-node src/diagnose-connectivity.ts
 *   npx ts-node src/diagnose-connectivity.ts --irc-host=192.168.1.5 --irc-port=6667
 */

import * as net from 'net';

// --- Config from env or defaults ---
const IRC_HOST = process.env.IRC_HOST || 'localhost';
const IRC_PORT = parseInt(process.env.IRC_PORT || '6667', 10);
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';

const TIMEOUT_MS = 5000;

function timestamp(): string {
    return new Date().toISOString().split('T')[1].replace('Z', '');
}

function log(tag: string, msg: string): void {
    const color = tag === 'IRC' ? '\x1b[36m' : tag === 'WS' ? '\x1b[35m' : '\x1b[33m';
    console.log(`${color}[${timestamp()}][${tag}]\x1b[0m ${msg}`);
}

function logError(tag: string, msg: string): void {
    console.log(`\x1b[31m[${timestamp()}][${tag}] ERROR:\x1b[0m ${msg}`);
}

function logSuccess(tag: string, msg: string): void {
    console.log(`\x1b[32m[${timestamp()}][${tag}] ✓\x1b[0m ${msg}`);
}

// ========================================
// Layer 1: TCP → IRC Server
// ========================================
async function testIRCConnection(): Promise<boolean> {
    return new Promise((resolve) => {
        log('IRC', `Testing TCP connection to ${IRC_HOST}:${IRC_PORT}...`);

        const socket = new net.Socket();
        let resolved = false;
        let receivedData = '';

        const timer = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                logError('IRC', `Timeout after ${TIMEOUT_MS}ms — no response from ${IRC_HOST}:${IRC_PORT}`);
                logError('IRC', 'Possible causes:');
                logError('IRC', '  • IRC server is not running');
                logError('IRC', '  • Docker container is not started (run: docker compose -f infra/ircd/docker-compose.yml up -d)');
                logError('IRC', '  • Firewall blocking port 6667');
                logError('IRC', `  • Wrong host/port (tried ${IRC_HOST}:${IRC_PORT})`);
                socket.destroy();
                resolve(false);
            }
        }, TIMEOUT_MS);

        socket.on('connect', () => {
            logSuccess('IRC', `TCP socket connected to ${IRC_HOST}:${IRC_PORT}`);

            // Send NICK and USER to test registration
            const testNick = `diag_${Date.now() % 10000}`;
            socket.write(`NICK ${testNick}\r\n`);
            socket.write(`USER ${testNick} 0 * :Diagnostic Test\r\n`);
            log('IRC', `Sent NICK ${testNick} and USER command`);
        });

        socket.on('data', (data) => {
            receivedData += data.toString();
            const lines = receivedData.split('\r\n');

            for (const line of lines) {
                if (!line.trim()) continue;

                // Handle PING/PONG
                if (line.startsWith('PING')) {
                    const pongParam = line.split(' ').slice(1).join(' ');
                    socket.write(`PONG ${pongParam}\r\n`);
                    log('IRC', `Responded to PING`);
                    continue;
                }

                log('IRC', `← ${line}`);

                // Check for 001 (Welcome = registration complete)
                if (line.includes(' 001 ')) {
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timer);
                        logSuccess('IRC', '🎉 IRC Registration successful! Server sent 001 (Welcome)');
                        logSuccess('IRC', 'The Gateway → IRC link is HEALTHY');
                        socket.write('QUIT :diagnostic complete\r\n');
                        setTimeout(() => { socket.destroy(); resolve(true); }, 500);
                    }
                }

                // Check for error numerics
                if (line.match(/ (4\d{2}|5\d{2}) /)) {
                    logError('IRC', `Server returned error: ${line}`);
                }
            }

            // Keep only the last incomplete line in buffer
            receivedData = lines[lines.length - 1] || '';
        });

        socket.on('error', (err) => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timer);
                logError('IRC', `Connection failed: ${err.message}`);

                if (err.message.includes('ECONNREFUSED')) {
                    logError('IRC', `No service listening on ${IRC_HOST}:${IRC_PORT}`);
                    logError('IRC', 'Fix: Start the IRC server with: docker compose -f infra/ircd/docker-compose.yml up -d');
                } else if (err.message.includes('ENOTFOUND')) {
                    logError('IRC', `Host "${IRC_HOST}" not found. Check your IRC_HOST config.`);
                }
                resolve(false);
            }
        });

        socket.on('close', () => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timer);
                logError('IRC', 'Connection closed before registration completed');
                resolve(false);
            }
        });

        socket.connect(IRC_PORT, IRC_HOST);
    });
}

// ========================================
// Layer 2: HTTP → Gateway
// ========================================
async function testGatewayConnection(): Promise<boolean> {
    log('WS', `Testing HTTP connection to Gateway at ${GATEWAY_URL}...`);

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const res = await fetch(GATEWAY_URL, { signal: controller.signal });
        clearTimeout(timer);

        logSuccess('WS', `Gateway responded with HTTP ${res.status}`);
        logSuccess('WS', 'The Frontend → Gateway HTTP link is HEALTHY');

        // Test Socket.IO endpoint
        const soUrl = `${GATEWAY_URL}/socket.io/?EIO=4&transport=polling`;
        log('WS', `Testing Socket.IO endpoint at ${soUrl}...`);

        const controller2 = new AbortController();
        const timer2 = setTimeout(() => controller2.abort(), TIMEOUT_MS);

        try {
            const soRes = await fetch(soUrl, { signal: controller2.signal });
            clearTimeout(timer2);

            if (soRes.status === 200) {
                logSuccess('WS', `Socket.IO endpoint responded with ${soRes.status} — WebSocket upgrade available`);
            } else if (soRes.status === 400) {
                // Socket.IO returns 400 when no auth token — this is expected
                logSuccess('WS', `Socket.IO endpoint responded (${soRes.status}) — Server is listening and requires auth (expected)`);
            } else {
                log('WS', `Socket.IO endpoint returned ${soRes.status} — may need investigation`);
            }
        } catch (soErr: any) {
            clearTimeout(timer2);
            if (soErr.name === 'AbortError') {
                logError('WS', 'Socket.IO endpoint timeout');
            } else {
                logError('WS', `Socket.IO endpoint error: ${soErr.message}`);
            }
        }

        return true;
    } catch (err: any) {
        if (err.name === 'AbortError') {
            logError('WS', `Timeout after ${TIMEOUT_MS}ms — Gateway not responding at ${GATEWAY_URL}`);
        } else if (err.message?.includes('ECONNREFUSED')) {
            logError('WS', `No service listening at ${GATEWAY_URL}`);
            logError('WS', 'Fix: Start the gateway with: cd apps/gateway && npm run dev');
        } else {
            logError('WS', `Connection failed: ${err.message}`);
        }
        return false;
    }
}

// ========================================
// Main
// ========================================
async function main() {
    console.log('\x1b[1m');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   IronCord Tri-Layer Connectivity Diagnostic     ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('\x1b[0m');
    console.log(`  IRC Server:  ${IRC_HOST}:${IRC_PORT}`);
    console.log(`  Gateway:     ${GATEWAY_URL}`);
    console.log(`  Timeout:     ${TIMEOUT_MS}ms`);
    console.log('');

    // Run both tests simultaneously
    const [ircResult, gatewayResult] = await Promise.all([
        testIRCConnection(),
        testGatewayConnection(),
    ]);

    console.log('');
    console.log('\x1b[1m═══ RESULTS ═══\x1b[0m');
    console.log(`  IRC Server (TCP ${IRC_HOST}:${IRC_PORT}):  ${ircResult ? '\x1b[32m✓ CONNECTED\x1b[0m' : '\x1b[31m✗ FAILED\x1b[0m'}`);
    console.log(`  Gateway (HTTP ${GATEWAY_URL}):  ${gatewayResult ? '\x1b[32m✓ CONNECTED\x1b[0m' : '\x1b[31m✗ FAILED\x1b[0m'}`);
    console.log('');

    if (ircResult && gatewayResult) {
        console.log('\x1b[32m  All layers are reachable. If messages still aren\'t flowing:\x1b[0m');
        console.log('  • Check that the Electron client connects to the Gateway (look for [SOCKET-DIAG] logs)');
        console.log('  • Check that the Gateway\'s IRC config has username/realname (look for [IRC-DIAG] logs)');
        console.log('  • Verify JWT auth token is valid');
    } else if (!ircResult && !gatewayResult) {
        console.log('\x1b[31m  Both layers are down. Start the infrastructure first:\x1b[0m');
        console.log('  1. docker compose -f infra/db/docker-compose.yml up -d');
        console.log('  2. docker compose -f infra/ircd/docker-compose.yml up -d');
        console.log('  3. cd apps/gateway && npm run dev');
    } else if (!ircResult) {
        console.log('\x1b[31m  The IRC server is the broken link.\x1b[0m');
        console.log('  Fix: docker compose -f infra/ircd/docker-compose.yml up -d');
    } else {
        console.log('\x1b[31m  The Gateway is the broken link.\x1b[0m');
        console.log('  Fix: cd apps/gateway && npm run dev');
    }

    console.log('');
    process.exit(ircResult && gatewayResult ? 0 : 1);
}

main().catch((err) => {
    console.error('Diagnostic script crashed:', err);
    process.exit(2);
});
