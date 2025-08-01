import { Option } from '@monorepo/shared-types';
import './OptionsTable.css';

interface OptionsTableProps {
  options: Option[];
  onSelectOption: (option: Option) => void;
  selectedOptionId?: string;
}

export const OptionsTable: React.FC<OptionsTableProps> = ({ 
  options, 
  onSelectOption, 
  selectedOptionId 
}) => {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysToExpiration = (expiration: Date | string) => {
    const exp = new Date(expiration);
    const now = new Date();
    const days = Math.floor((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="options-table-wrapper">
      <table className="options-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Type</th>
            <th>Strike</th>
            <th>Expiration</th>
            <th>Days to Exp</th>
            <th>Premium</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {options.map((option) => {
            const daysToExp = getDaysToExpiration(option.expiration);
            const isSelected = option.id === selectedOptionId;
            
            return (
              <tr 
                key={option.id}
                onClick={() => onSelectOption(option)}
                className={`option-row ${isSelected ? 'selected' : ''}`}
              >
                <td className="symbol">{option.symbol}</td>
                <td>
                  <span className={`option-type ${option.type}`}>
                    {option.type.toUpperCase()}
                  </span>
                </td>
                <td className="strike">${option.strike}</td>
                <td>{formatDate(option.expiration)}</td>
                <td className={`days-to-exp ${daysToExp < 7 ? 'expiring-soon' : ''}`}>
                  {daysToExp}
                </td>
                <td className="premium">${option.premium.toFixed(2)}</td>
                <td>
                  <span className={`status ${option.status}`}>
                    {option.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {options.length === 0 && (
        <div className="no-options">No options available</div>
      )}
    </div>
  );
};