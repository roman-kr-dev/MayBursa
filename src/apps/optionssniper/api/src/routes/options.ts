import { Router } from 'express';
import { Option, ApiResponse, PriceUpdate } from '@monorepo/shared-types';

export const optionsRouter: Router = Router();

// Mock data generator
const generateMockOptions = (): Option[] => {
  const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
  const options: Option[] = [];
  
  symbols.forEach(symbol => {
    // Generate calls and puts
    ['call', 'put'].forEach(type => {
      for (let i = 0; i < 5; i++) {
        const basePrice = 100 + Math.random() * 200;
        const strike = Math.round(basePrice + (Math.random() - 0.5) * 20);
        
        options.push({
          id: `${symbol}-${type}-${strike}-${Date.now()}-${i}`,
          symbol,
          type: type as 'call' | 'put',
          strike,
          expiration: new Date(Date.now() + (7 + i * 7) * 24 * 60 * 60 * 1000), // Weekly expirations
          premium: parseFloat((Math.random() * 10 + 1).toFixed(2)),
          contractSize: 100,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    });
  });
  
  return options;
};

// GET /api/options
optionsRouter.get('/', async (req, res) => {
  const { symbol, type, status } = req.query;
  
  let options = generateMockOptions();
  
  // Apply filters
  if (symbol) {
    options = options.filter(opt => opt.symbol === symbol);
  }
  if (type) {
    options = options.filter(opt => opt.type === type);
  }
  if (status) {
    options = options.filter(opt => opt.status === status);
  }
  
  const response: ApiResponse<Option[]> = {
    success: true,
    data: options,
    meta: {
      timestamp: new Date(),
      requestId: `req-${Date.now()}`,
      pagination: {
        page: 1,
        pageSize: options.length,
        totalPages: 1,
        totalItems: options.length
      }
    }
  };
  
  res.json(response);
});

// GET /api/options/:id
optionsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  // Mock single option
  const option: Option = {
    id,
    symbol: 'AAPL',
    type: 'call',
    strike: 150,
    expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    premium: 5.75,
    contractSize: 100,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const response: ApiResponse<Option> = {
    success: true,
    data: option,
    meta: {
      timestamp: new Date(),
      requestId: `req-${Date.now()}`
    }
  };
  
  res.json(response);
});

// GET /api/options/:id/prices
optionsRouter.get('/:id/prices', async (req, res) => {
  const { id } = req.params;
  
  // Generate mock price history
  const prices: PriceUpdate[] = [];
  const now = Date.now();
  
  for (let i = 0; i < 20; i++) {
    const basePrice = 5 + Math.random() * 5;
    prices.push({
      id: `price-${id}-${i}`,
      optionId: id,
      bid: parseFloat((basePrice - 0.05).toFixed(2)),
      ask: parseFloat((basePrice + 0.05).toFixed(2)),
      last: parseFloat(basePrice.toFixed(2)),
      volume: Math.floor(Math.random() * 10000),
      openInterest: Math.floor(Math.random() * 50000),
      impliedVolatility: parseFloat((0.2 + Math.random() * 0.3).toFixed(4)),
      timestamp: new Date(now - i * 60 * 60 * 1000) // Hourly data
    });
  }
  
  const response: ApiResponse<PriceUpdate[]> = {
    success: true,
    data: prices,
    meta: {
      timestamp: new Date(),
      requestId: `req-${Date.now()}`
    }
  };
  
  res.json(response);
});