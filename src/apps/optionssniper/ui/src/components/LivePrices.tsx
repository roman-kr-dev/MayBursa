import { PriceUpdate } from '@monorepo/shared-types';
import './LivePrices.css';

interface LivePricesProps {
  prices: PriceUpdate[];
}

export const LivePrices: React.FC<LivePricesProps> = ({ prices }) => {
  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };

  const formatIV = (iv: number) => {
    return `${(iv * 100).toFixed(1)}%`;
  };

  if (prices.length === 0) {
    return (
      <div className="live-prices-empty">
        Waiting for live price updates...
      </div>
    );
  }

  return (
    <div className="live-prices">
      {prices.map((price) => (
        <div key={price.id} className="price-card">
          <div className="price-header">
            <span className="option-id">{price.optionId}</span>
            <span className="timestamp">
              {new Date(price.timestamp).toLocaleTimeString()}
            </span>
          </div>
          
          <div className="price-grid">
            <div className="price-item">
              <span className="label">Bid</span>
              <span className="value bid">${formatPrice(price.bid)}</span>
            </div>
            <div className="price-item">
              <span className="label">Ask</span>
              <span className="value ask">${formatPrice(price.ask)}</span>
            </div>
            <div className="price-item">
              <span className="label">Last</span>
              <span className="value last">${formatPrice(price.last)}</span>
            </div>
            <div className="price-item">
              <span className="label">Volume</span>
              <span className="value">{formatVolume(price.volume)}</span>
            </div>
            <div className="price-item">
              <span className="label">OI</span>
              <span className="value">{formatVolume(price.openInterest)}</span>
            </div>
            <div className="price-item">
              <span className="label">IV</span>
              <span className="value">{formatIV(price.impliedVolatility)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};