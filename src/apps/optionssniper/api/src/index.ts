import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'express-async-errors';
import { optionsRouter } from './routes/options';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'optionssniper-api',
    timestamp: new Date().toISOString() 
  });
});

// Routes
app.use('/api/options', optionsRouter);

// Error handling middleware (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`OptionsSniper API Server running on port ${PORT}`);
});