
require('dotenv').config();

const readline = require('readline');
const bcrypt = require('bcryptjs');
const db = require('../src/db');

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Password input is masked
function askPassword(question) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    let password = '';

    if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
      reject(new Error('Please run this script in the VS Code terminal.'));
      return;
    }

    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function cleanup() {
      stdin.removeListener('data', handleInput);
      stdin.setRawMode(false);
      stdin.pause();
    }

    function handleInput(char) {
      if (char === '\u0003') {
        cleanup();
        process.stdout.write('\n');
        reject(new Error('Setup cancelled.'));
        return;
      }

      if (char === '\r' || char === '\n') {
        cleanup();
        process.stdout.write('\n');
        resolve(password);
        return;
      }

      if (char === '\u007f' || char === '\b') {
        password = password.slice(0, -1);
        process.stdout.write('\b \b');
        return;
      }

      if (char >= ' ') {
        password += char;
        process.stdout.write('*');
      }
    }

    stdin.on('data', handleInput);
  });
}

async function createOwner() {
  try {
    console.log('\n=== PERFECT SMILE MAKER ===');
    console.log('Initial Owner Account Setup\n');

    if (!process.env.JWT_SECRET ||
        process.env.JWT_SECRET === 'change-this-to-a-long-random-text') {
      throw new Error('Configure a secure JWT_SECRET in .env first.');
    }

    // Prevent duplicate initial setup
    const [countRows] = await db.execute(
      'SELECT COUNT(*) AS total FROM user'
    );

    if (Number(countRows[0].total) > 0) {
      throw new Error(
        'An account already exists. Initial setup is disabled.'
      );
    }

    const fullName = await ask('Owner full name: ');
    const username = await ask('Owner username: ');

    if (!fullName || fullName.length > 50) {
      throw new Error('Full name must contain 1-50 characters.');
    }

    if (!username || username.length > 50) {
      throw new Error('Username must contain 1-50 characters.');
    }

    const password = await askPassword('Owner password: ');
    const confirmPassword = await askPassword('Confirm password: ');

    if (password.length < 12) {
      throw new Error('Password must be at least 12 characters.');
    }

    if (password.length > 72) {
      throw new Error('Password must not exceed 72 bytes.');
    }

    if (password !== confirmPassword) {
      throw new Error('Passwords do not match.');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.execute(
      `INSERT INTO user
       (full_name, role, username, password_hash)
       VALUES (?, ?, ?, ?)`,
      [fullName, 'owner', username, passwordHash]
    );

    console.log('\nOwner account created successfully!');
    console.log('Role: owner');
    console.log('Username: ' + username);
    console.log('Password: [hidden]');

  } catch (error) {
    console.error('\nSetup failed:', error.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

createOwner();
