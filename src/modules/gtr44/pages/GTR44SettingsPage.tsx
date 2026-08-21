import { Button } from '../../../components/ui/button';
import { GTR44SettingsView } from '../components/GTR44SettingsView';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';

export function GTR44SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <WorkspaceHeader
        eyebrow="Configuration · GTR-44"
        title="GTR-44 Bill Settings"
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/gtr44/list')} className="gap-1 font-medium">
            <ChevronLeft className="h-4 w-4" /> Back to Register
          </Button>
        }
      />

      <div className="max-w-6xl mx-auto">
        <GTR44SettingsView />
      </div>
    </div>
  );
}

