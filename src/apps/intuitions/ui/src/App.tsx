import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CreateIntuition from './pages/CreateIntuition';
import EditIntuition from './pages/EditIntuition';
import ViewIntuition from './pages/ViewIntuition';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="create" element={<CreateIntuition />} />
        <Route path="intuition/:id" element={<ViewIntuition />} />
        <Route path="intuition/:id/edit" element={<EditIntuition />} />
      </Route>
    </Routes>
  );
}

export default App;