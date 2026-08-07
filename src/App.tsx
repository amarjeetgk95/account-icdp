import { useModules } from '@/modules';
import { Layout } from '@/shared/components/Layout';
import { Routes } from '@/shared/components/Routes';
import { Sidebar } from '@/shared/components/Sidebar';

export default function App() {
  const modules = useModules();

  return (
    <Layout>
      <Sidebar modules={modules} />
      <main className="flex-1 p-6 overflow-auto">
        <Routes modules={modules} />
      </main>
    </Layout>
  );
}
