
process.env.JWT_SECRET = 'psm-test-secret-only';

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

function createTestToken() {
    return jwt.sign(
        { user_id: 1, role: 'Owner', name: 'Test Owner' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
}

async function withServer(fn) {
    const server = app.listen(0);

    try {
        await fn('http://localhost:' + server.address().port);
    } finally {
        await new Promise((resolve, reject) => {
            server.close(error => {
                if (error) reject(error);
                else resolve();
            });
        });
    }
}

test('health endpoint works', () => withServer(async (base) => {
    const r = await fetch(base + '/api/health');
    const body = await r.json();

    assert.equal(r.status, 200);
    assert.equal(body.data.status, 'ok');
}));

test('holidays endpoint needs login', () => withServer(async (base) => {
    const r = await fetch(base + '/api/holidays/2026');

    assert.equal(r.status, 401);
}));

test('patients endpoint needs login', () => withServer(async (base) => {
    const r = await fetch(base + '/api/patients');

    assert.equal(r.status, 401);
}));

test('dashboard endpoint needs login', () => withServer(async (base) => {
    const r = await fetch(base + '/api/dashboard/summary');

    assert.equal(r.status, 401);
}));

test('holidays endpoint rejects invalid year', () => withServer(async (base) => {
    const token = createTestToken();

    const r = await fetch(base + '/api/holidays/1800', {
        headers: {
            Authorization: 'Bearer ' + token
        }
    });

    const body = await r.json();

    assert.equal(r.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.message, 'Invalid year');
}));

test('holidays endpoint handles external API failure', () => withServer(async (base) => {
    const token = createTestToken();
    const originalFetch = global.fetch;

    global.fetch = async (url, options) => {
        if (String(url).startsWith('https://date.nager.at/')) {
            throw new Error('Simulated holiday API outage');
        }

        return originalFetch(url, options);
    };

    try {
        const r = await fetch(base + '/api/holidays/2026', {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });

        const body = await r.json();

        assert.equal(r.status, 502);
        assert.equal(body.success, false);
        assert.deepEqual(body.data, []);
        assert.equal(body.message, 'Holiday service unavailable');
    } finally {
        global.fetch = originalFetch;
    }
}));
