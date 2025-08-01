import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Intuition } from '@monorepo/shared-types';
import { Card } from '@monorepo/ui-components';
import IntuitionForm from '../components/IntuitionForm';
import { api } from '../services/api';

export default function EditIntuition() {
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

  const handleSubmit = async (data: Omit<Intuition, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!id) return;
    await api.updateIntuition(id, data);
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Intuition</h1>
        <p className="text-gray-600 mt-1">
          Update your insight with new information or perspectives
        </p>
      </div>

      <Card>
        <div className="p-6">
          <IntuitionForm intuition={intuition} onSubmit={handleSubmit} />
        </div>
      </Card>
    </div>
  );
}