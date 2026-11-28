
require('dotenv').config({
    path: process.env.ENV_FILE || require('path').join(__dirname, '.env')
});

console.log('JWT_SECRET loaded:', Boolean(process.env.JWT_SECRET));

const app = require('./src/app');

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log('PSM running on port ' + port);
    console.log('Database mode: ' + (process.env.DB_MODE || 'local'));
});
