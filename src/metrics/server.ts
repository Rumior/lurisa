import { createServer } from 'http';
import { register } from '@/lib/metrics';

const server = createServer(async (req, res) => {
  if (req.url === '/metrics') {
    const metrics = await register.metrics();
    res.writeHead(200, { 'Content-Type': register.contentType });
    res.end(metrics);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = process.env.METRICS_PORT || 9090;
server.listen(PORT, () => {
  console.log(`[Metrics Server] Listening on port ${PORT}`);
});
