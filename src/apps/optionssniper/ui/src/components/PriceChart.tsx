import { useEffect, useState } from 'react';
import { PriceUpdate, ApiResponse } from '@monorepo/shared-types';
import './PriceChart.css';

interface PriceChartProps {
  optionId: string;
  livePrices: PriceUpdate[];
}

export const PriceChart: React.FC<PriceChartProps> = ({ optionId, livePrices }) => {
  const [historicalPrices, setHistoricalPrices] = useState<PriceUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistoricalPrices();
  }, [optionId]);

  const fetchHistoricalPrices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/options/${optionId}/prices`);
      const data: ApiResponse<PriceUpdate[]> = await response.json();
      
      if (data.success && data.data) {
        setHistoricalPrices(data.data);
      }
    } catch (error) {
      console.error('Error fetching historical prices:', error);
    } finally {
      setLoading(false);
    }
  };

  // Combine historical and live prices
  const allPrices = [...historicalPrices, ...livePrices].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  if (loading) {
    return <div className="price-chart-loading">Loading price history...</div>;
  }

  if (allPrices.length === 0) {
    return <div className="price-chart-empty">No price data available</div>;
  }

  // Simple text-based chart
  const maxPrice = Math.max(...allPrices.map(p => p.last));
  const minPrice = Math.min(...allPrices.map(p => p.last));
  const priceRange = maxPrice - minPrice || 1;

  return (
    <div className="price-chart">
      <h3>Price History</h3>
      <div className="chart-stats">
        <div className="stat">
          <span className="label">High:</span>
          <span className="value">${maxPrice.toFixed(2)}</span>
        </div>
        <div className="stat">
          <span className="label">Low:</span>
          <span className="value">${minPrice.toFixed(2)}</span>
        </div>
        <div className="stat">
          <span className="label">Current:</span>
          <span className="value">${allPrices[allPrices.length - 1].last.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="simple-chart">
        {allPrices.slice(-20).map((price, index) => {
          const height = ((price.last - minPrice) / priceRange) * 100;
          const isLive = livePrices.some(p => p.id === price.id);
          
          return (
            <div key={price.id} className="chart-bar-wrapper">
              <div 
                className={`chart-bar ${isLive ? 'live' : ''}`}
                style={{ height: `${height}%` }}
                title={`$${price.last.toFixed(2)} at ${new Date(price.timestamp).toLocaleTimeString()}`}
              />
              <div className="chart-label">
                {index % 4 === 0 ? new Date(price.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                }) : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};