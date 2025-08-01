import { useState, useEffect } from 'react';
import { Search, Filter, TrendingUp } from 'lucide-react';
import type { Intuition, Tag } from '@monorepo/shared-types';
import { Input, Card } from '@monorepo/ui-components';
import IntuitionCard from '../components/IntuitionCard';
import { api } from '../services/api';

export default function Dashboard() {
  const [intuitions, setIntuitions] = useState<Intuition[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [minConfidence, setMinConfidence] = useState<number>(0);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getIntuitions(),
      api.getTags(),
    ]).then(([intuitionsData, tagsData]) => {
      setIntuitions(intuitionsData);
      setTags(tagsData);
      setLoading(false);
    }).catch(error => {
      console.error('Failed to load data:', error);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const fetchFiltered = async () => {
      try {
        const filtered = await api.getIntuitions({
          search: searchTerm,
          tags: selectedTags,
          minConfidence: minConfidence > 0 ? minConfidence : undefined,
        });
        setIntuitions(filtered);
      } catch (error) {
        console.error('Failed to filter intuitions:', error);
      }
    };

    const debounceTimer = setTimeout(fetchFiltered, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, selectedTags, minConfidence]);

  const handleTagToggle = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading intuitions...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Intuitions</h1>
        <p className="text-gray-600">Capture and track your insights about the future</p>
      </div>

      <Card className="mb-6">
        <div className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="search"
                placeholder="Search intuitions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                showFilters
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
              {(selectedTags.length > 0 || minConfidence > 0) && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-yellow-500 text-white rounded-full">
                  {selectedTags.length + (minConfidence > 0 ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleTagToggle(tag.name)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          selectedTags.includes(tag.name)
                            ? 'bg-yellow-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum confidence: {minConfidence > 0 ? `${minConfidence}%` : 'Any'}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={minConfidence}
                    onChange={(e) => setMinConfidence(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Any</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {intuitions.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No intuitions found</h3>
            <p className="text-gray-500">
              {searchTerm || selectedTags.length > 0 || minConfidence > 0
                ? 'Try adjusting your filters'
                : 'Start by creating your first intuition'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {intuitions.map((intuition) => (
            <IntuitionCard key={intuition.id} intuition={intuition} />
          ))}
        </div>
      )}
    </div>
  );
}