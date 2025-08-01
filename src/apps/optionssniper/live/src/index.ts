import { WebSocketServer } from 'ws';
import { PriceUpdate } from '@monorepo/shared-types';

const PORT = process.env.PORT || 3002;
const wss = new WebSocketServer({ port: Number(PORT) });

console.log(`OptionsSniper Live WebSocket Server running on port ${PORT}`);

// Track active options being monitored
const activeOptions = new Map<string, { symbol: string; strike: number; type: string }>();

// Generate mock price update
const generatePriceUpdate = (optionId: string): PriceUpdate => {
  const basePrice = 5 + Math.random() * 10;
  const spread = 0.05 + Math.random() * 0.1;
  
  return {
    id: `price-${Date.now()}`,
    optionId,
    bid: parseFloat((basePrice - spread / 2).toFixed(2)),
    ask: parseFloat((basePrice + spread / 2).toFixed(2)),
    last: parseFloat(basePrice.toFixed(2)),
    volume: Math.floor(Math.random() * 10000),
    openInterest: Math.floor(Math.random() * 50000),
    impliedVolatility: parseFloat((0.2 + Math.random() * 0.3).toFixed(4)),
    timestamp: new Date()
  };
};

wss.on('connection', (ws) => {
  console.log('New client connected');
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to OptionsSniper Live Server',
    timestamp: new Date()
  }));
  
  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'subscribe':
          if (message.optionId) {
            activeOptions.set(message.optionId, {
              symbol: message.symbol || 'UNKNOWN',
              strike: message.strike || 0,
              type: message.type || 'call'
            });
            ws.send(JSON.stringify({
              type: 'subscribed',
              optionId: message.optionId,
              message: `Subscribed to ${message.optionId}`
            }));
          }
          break;
          
        case 'unsubscribe':
          if (message.optionId) {
            activeOptions.delete(message.optionId);
            ws.send(JSON.stringify({
              type: 'unsubscribed',
              optionId: message.optionId,
              message: `Unsubscribed from ${message.optionId}`
            }));
          }
          break;
          
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date() }));
          break;
          
        default:
          ws.send(JSON.stringify({
            type: 'error',
            message: `Unknown message type: ${message.type}`
          }));
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Broadcast price updates every 2 seconds
setInterval(() => {
  if (wss.clients.size > 0) {
    // Generate updates for all active options
    const updates: PriceUpdate[] = [];
    
    // If no specific options are subscribed, send some default ones
    if (activeOptions.size === 0) {
      const defaultOptions = [
        'AAPL-call-150-default',
        'GOOGL-call-2800-default',
        'MSFT-put-350-default',
        'TSLA-call-200-default',
        'AMZN-put-170-default'
      ];
      
      defaultOptions.forEach(optionId => {
        updates.push(generatePriceUpdate(optionId));
      });
    } else {
      activeOptions.forEach((_, optionId) => {
        updates.push(generatePriceUpdate(optionId));
      });
    }
    
    // Broadcast to all connected clients
    const message = JSON.stringify({
      type: 'price_update',
      data: updates,
      timestamp: new Date()
    });
    
    wss.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }
}, 2000);

// Health check endpoint for monitoring
import http from 'http';

const healthServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'optionssniper-live',
      connections: wss.clients.size,
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

healthServer.listen(Number(PORT) + 1000, () => {
  console.log(`Health check endpoint available at http://localhost:${Number(PORT) + 1000}/health`);
});