
require('dotenv').config();

const bcrypt = require('bcryptjs');
const db = require('./src/db');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function resetPassword() {
  try {
    const username = 'chesca_25';

    rl.question('Enter your new password: ', async (password) => {
      if (!password || password.length < 12) {
        console.log('Password must be at least 12 characters.');
        rl.close();
        await db.end();
        return;
      }

      const hash = await bcrypt.hash(password, 12);

      const [result] = await db.execute(
        'UPDATE user SET password_hash = ? WHERE username = ?',
        [hash, username]
      );

      console.log(
        result.affectedRows === 1
          ? 'Password updated successfully!'
          : 'Account not found.'
      );

      rl.close();
      await db.end();
    });
  } catch (error) {
    console.error('Password update failed:', error.message);
    rl.close();
    await db.end();
  }
}

resetPassword();
