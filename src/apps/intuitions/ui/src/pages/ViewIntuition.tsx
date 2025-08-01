import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Calendar, Clock, TrendingUp, Tag } from 'lucide-react';
import type { Intuition } from '@monorepo/shared-types';
import { Card, Button } from '@monorepo/ui-components';
import { api } from '../services/api';

export default function ViewIntuition() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [intuition, setIntuition] = useState<Intuition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    api.getIntuition(id)
      .then(setIntuition)
      .catch(error => {
        console.error('Failed to load intuition:', error);
        navigate('/');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this intuition?')) return;

    try {
      await api.deleteIntuition(id);
      navigate('/');
    } catch (error) {
      console.error('Failed to delete intuition:', error);
      alert('Failed to delete intuition. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading intuition...</div>
      </div>
    );
  }

  if (!intuition) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Intuition not found</p>
      </div>
    );
  }

  const confidenceColor = 
    intuition.confidence >= 80 ? 'text-green-600' :
    intuition.confidence >= 60 ? 'text-yellow-600' :
    'text-red-600';

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{intuition.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Created {new Date(intuition.createdAt).toLocaleDateString()}
              </span>
              {intuition.updatedAt !== intuition.createdAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Updated {new Date(intuition.updatedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate(`/intuition/${id}/edit`)}
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="secondary"
              onClick={handleDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
              <div className="prose prose-gray max-w-none">
                <p className="whitespace-pre-wrap">{intuition.content}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Confidence Level</label>
                  <div className="mt-1 flex items-center gap-2">
                    <TrendingUp className={`h-5 w-5 ${confidenceColor}`} />
                    <span className={`text-lg font-semibold ${confidenceColor}`}>
                      {intuition.confidence}%
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        intuition.confidence >= 80 ? 'bg-green-600' :
                        intuition.confidence >= 60 ? 'bg-yellow-600' :
                        'bg-red-600'
                      }`}
                      style={{ width: `${intuition.confidence}%` }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Timeframe</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-900">{intuition.timeframe}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Tags</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {intuition.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}