import { Card } from '@monorepo/ui-components';
import IntuitionForm from '../components/IntuitionForm';
import { api } from '../services/api';

export default function CreateIntuition() {
  const handleSubmit = async (data: Parameters<typeof api.createIntuition>[0]) => {
    await api.createIntuition(data);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Intuition</h1>
        <p className="text-gray-600 mt-1">
          Document your insights and predictions about the future
        </p>
      </div>

      <Card>
        <div className="p-6">
          <IntuitionForm onSubmit={handleSubmit} />
        </div>
      </Card>
    </div>
  );
}