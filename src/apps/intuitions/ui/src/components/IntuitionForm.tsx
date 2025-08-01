import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import type { Intuition, Tag } from '@monorepo/shared-types';
import { Button, Input, Textarea } from '@monorepo/ui-components';
import { api } from '../services/api';

interface IntuitionFormProps {
  intuition?: Intuition;
  onSubmit: (data: Omit<Intuition, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

const timeframeOptions = [
  { value: '0-1 year', label: 'Within 1 year' },
  { value: '1-3 years', label: '1-3 years' },
  { value: '2-5 years', label: '2-5 years' },
  { value: '5-10 years', label: '5-10 years' },
  { value: '10+ years', label: 'More than 10 years' },
];

export default function IntuitionForm({ intuition, onSubmit }: IntuitionFormProps) {
  const navigate = useNavigate();
  const [tags, setTags] = useState<Tag[]>([]);
  const [formData, setFormData] = useState({
    title: intuition?.title || '',
    content: intuition?.content || '',
    tags: intuition?.tags || [],
    confidence: intuition?.confidence || 50,
    timeframe: intuition?.timeframe || '1-3 years',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.getTags().then(setTags).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
      navigate('/');
    } catch (error) {
      console.error('Failed to save intuition:', error);
      alert('Failed to save intuition. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTagToggle = (tagName: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagName)
        ? prev.tags.filter(t => t !== tagName)
        : [...prev.tags, tagName],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Title
        </label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Enter a concise title for your intuition"
          required
        />
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
          Content
        </label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
          placeholder="Describe your intuition in detail..."
          rows={6}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleTagToggle(tag.name)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                formData.tags.includes(tag.name)
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="confidence" className="block text-sm font-medium text-gray-700 mb-1">
            Confidence Level: {formData.confidence}%
          </label>
          <input
            type="range"
            id="confidence"
            min="0"
            max="100"
            step="5"
            value={formData.confidence}
            onChange={(e) => setFormData(prev => ({ ...prev, confidence: parseInt(e.target.value) }))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>

        <div>
          <label htmlFor="timeframe" className="block text-sm font-medium text-gray-700 mb-1">
            Timeframe
          </label>
          <select
            id="timeframe"
            value={formData.timeframe}
            onChange={(e) => setFormData(prev => ({ ...prev, timeframe: e.target.value }))}
            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
          >
            {timeframeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate('/')}
          disabled={isSubmitting}
        >
          <X className="h-4 w-4" />
          Cancel
        </Button>
        
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          <Save className="h-4 w-4" />
          {isSubmitting ? 'Saving...' : 'Save Intuition'}
        </Button>
      </div>
    </form>
  );
}