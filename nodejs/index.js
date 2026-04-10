const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const rootEnv = path.join(__dirname, '..', '.env');
if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
}

process.env.PORT = process.env.NODEJS_PORT || process.env.PORT || '3000';
process.env.BACKEND_HOST = process.env.PUBLIC_IP || process.env.BACKEND_HOST || '127.0.0.1';

require('./src/app/index.js');
