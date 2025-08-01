import { Link } from 'react-router-dom';
import { Calendar, TrendingUp, Clock, Tag } from 'lucide-react';
import type { Intuition } from '@monorepo/shared-types';
import { Card } from '@monorepo/ui-components';

interface IntuitionCardProps {
  intuition: Intuition;
}

export default function IntuitionCard({ intuition }: IntuitionCardProps) {
  const confidenceColor = 
    intuition.confidence >= 80 ? 'text-green-600' :
    intuition.confidence >= 60 ? 'text-yellow-600' :
    'text-red-600';

  return (
    <Link to={`/intuition/${intuition.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {intuition.title}
          </h3>
          
          <p className="text-gray-600 mb-4 line-clamp-3">
            {intuition.content}
          </p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {intuition.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-gray-500">
                <Clock className="h-4 w-4" />
                {intuition.timeframe}
              </span>
              
              <span className={`flex items-center gap-1 font-medium ${confidenceColor}`}>
                <TrendingUp className="h-4 w-4" />
                {intuition.confidence}%
              </span>
            </div>
            
            <span className="flex items-center gap-1 text-gray-400">
              <Calendar className="h-4 w-4" />
              {new Date(intuition.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}