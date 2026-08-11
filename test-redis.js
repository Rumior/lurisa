require('dotenv').config();
const { Redis } = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.ping().then(r => {
  console.log('Redis:', r);
  console.log('URL:', process.env.REDIS_URL?.replace(/:.*@/, ':****@'));
  redis.disconnect();
}).catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
