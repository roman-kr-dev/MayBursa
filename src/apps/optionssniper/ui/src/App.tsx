import { useState, useEffect } from 'react';
import { Option, ApiResponse } from '@monorepo/shared-types';
import { Card, Button } from '@monorepo/ui-components';
import { useWebSocket } from './hooks/useWebSocket';
import { OptionsTable } from './components/OptionsTable';
import { PriceChart } from './components/PriceChart';
import { LivePrices } from './components/LivePrices';
import './App.css';

function App() {
  const [options, setOptions] = useState<Option[]>([]);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { prices, isConnected } = useWebSocket('ws://localhost:3002');

  // Fetch options on mount
  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/options');
      const data: ApiResponse<Option[]> = await response.json();
      
      if (data.success && data.data) {
        setOptions(data.data);
      } else {
        setError(data.error?.message || 'Failed to fetch options');
      }
    } catch (err) {
      setError('Failed to connect to API server');
      console.error('Error fetching options:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>OptionsSniper Trading Dashboard</h1>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
          {isConnected ? 'Live Updates Active' : 'Connecting...'}
        </div>
      </header>

      <main className="app-main">
        <div className="dashboard-grid">
          <section className="options-section">
            <Card>
              <div className="section-header">
                <h2>Options Chain</h2>
                <Button onClick={fetchOptions} disabled={loading}>
                  Refresh
                </Button>
              </div>
              
              {error && (
                <div className="error-message">{error}</div>
              )}
              
              {loading ? (
                <div className="loading">Loading options...</div>
              ) : (
                <OptionsTable 
                  options={options}
                  onSelectOption={setSelectedOption}
                  selectedOptionId={selectedOption?.id}
                />
              )}
            </Card>
          </section>

          <section className="prices-section">
            <Card>
              <h2>Live Prices</h2>
              <LivePrices prices={prices} />
            </Card>
          </section>

          {selectedOption && (
            <section className="details-section">
              <Card>
                <h2>Option Details</h2>
                <div className="option-details">
                  <div className="detail-row">
                    <span className="label">Symbol:</span>
                    <span className="value">{selectedOption.symbol}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Type:</span>
                    <span className={`value option-type-${selectedOption.type}`}>
                      {selectedOption.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Strike:</span>
                    <span className="value">${selectedOption.strike}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Expiration:</span>
                    <span className="value">
                      {new Date(selectedOption.expiration).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Premium:</span>
                    <span className="value">${selectedOption.premium}</span>
                  </div>
                </div>
                
                <PriceChart 
                  optionId={selectedOption.id}
                  livePrices={prices.filter(p => p.optionId === selectedOption.id)}
                />
              </Card>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;