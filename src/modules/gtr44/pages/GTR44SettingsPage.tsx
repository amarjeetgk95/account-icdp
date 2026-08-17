import { Button } from '../../../components/ui/button';
import { GTR44SettingsView } from '../components/GTR44SettingsView';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export function GTR44SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="page-header">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" className="mr-2" onClick={() => navigate('/gtr44/list')} title="Back">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="page-title">GTR-44 Bill Settings</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <GTR44SettingsView />
      </div>
    </div>
  );
}
