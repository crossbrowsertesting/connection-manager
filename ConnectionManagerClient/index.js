const axios = require('axios');
const argv = require('yargs')
    .options({
        'username': {
            demandOption: true,
            description: 'Your CBT username, also used for logging into your account',
        },
        'authkey': {
            demandOption: true,
            description: 'Your CBT authorization key, which can be found here: https://app.crossbrowsertesting.com/account',
        },
        'command': {
            description: '"start", "stop", or get the "status" of your ECM-managed tunnel',
            demandOption: true,
        },
        'acceptAllCerts': {
            description: 'Allows insecure certs',
            default: false,
        },
        'bypass': {
            description: 'Allows requests to bypass tunnel in the case that they are publicly accessible.',
            default: true,
        },
        'env': {
            description: false,
            hide: true,
            default: 'prod'
        },
    }).argv;

const env = argv.env;
const username = argv.username;
const authkey = argv.authkey;
const auth = {
    username: username,
    password: authkey,
};

let appUrl;
switch(env){
    case 'qa':
        appUrl = 'https://qaapp.crossbrowsertesting.com/api/v3';
        break;
    case 'test':
        appUrl = 'https://test.crossbrowsertesting.com/api/v3'
        break;
    case 'local':
        appUrl = 'http://localhost:3000/api/v3';
        break;
    case 'prod':
    default:
        appUrl = 'https://livetestdirect.crossbrowsertesting.com/api/v3';
}

async function getTunnels() {
    const params = {
        active: true,
    };
    const response = await axios.get(`${appUrl}/tunnels?active=true`, { auth });
    return response.data.tunnels;
}

async function startTunnel() {
    console.log('Starting tunnel');

    if (argv.acceptAllCerts === 'false') {
        argv.acceptAllCerts = false;
    } else {
        argv.acceptAllCerts = true;
    }

    const params = {
        accept_all_certs: argv.acceptAllCerts,
        direct_resolution: argv.bypass,
        tunnel_source: 'enterprise',
        tunnel_type: 'simpleproxy'
    };

    let response;
    try {
        response = await axios.post(`${appUrl}/localconman`, { params }, { auth });

        if (response.data) {
            if (!response.data.localConnectionManagerRunning) {
                console.log('It looks like the local connection manager is not running');
            }

            if (response.data.tunnel_id) {
                console.log('Started tunnel successfully');
            }
        } else {
            throw new Error(`Could not parse response from CBT`);
        }
    } catch (tunnelStartException) {
        console.error(`Error starting tunnel! ${tunnelStartException.stack}`);
        return;
    }
}

async function stopTunnel() {
    console.log('Stopping tunnel');
    let tunnels;
    try {
        tunnels = await getTunnels();
    } catch (getTunnelsException) {
        console.error(`Error received stopping tunnel: ${getTunnelsException.stack}`);
        return;
    }

    let tunnelId;
    if (tunnels.length > 0) {
        tunnelId = tunnels[0].tunnel_id;
    } else {
        console.error(`No active tunnel to stop!`);
    }

    const params = {
        tunnelId,
    };

    let response;
    try {
        response = await axios.delete(`${appUrl}/tunnels/${tunnelId}`, { auth });
    } catch (tunnelStopException) {
        console.error(`Error received stopping tunnel: ${tunnelStopException.stack}`);
        return;
    }

    console.log('Tunnel stopped successfully');
}

async function getTunnelStatus() {
    console.log('Retrieving tunnel status');
    let tunnels;
    try {
        tunnels = await getTunnels();
    } catch (getTunnelException) {
        console.error(`Error received getting tunnel status: ${getTunnelException.stack}`);
        return;
    }

    if (tunnels.length > 0) {
        console.log(`Tunnel active!`);
        return true;
    } else {
        console.log(`No tunnel started`);
        return false;
    }
}

async function main() {
    const command = argv.command;

    switch(command) {
        case 'start':
            await startTunnel();
            break;
        case 'stop':
            await stopTunnel();
            break;
        case 'status':
            await getTunnelStatus();
            break;
        default:
            console.error('Invalid command, please use one of the following: start, stop, status');
    }
}

main();


