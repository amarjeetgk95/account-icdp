import { Button } from '@/components/ui/button';
import { GTR30SettingsView } from '../components/GTR30SettingsView';
import { GTR30SettingsSyncBadge } from '../components/GTR30SettingsSyncBadge';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Settings } from 'lucide-react';

export function GTR30SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-20">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/gtr30/list')} title="Back">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Settings className="h-4 w-4" /> GTR-30 Pay Bill Settings
            </h1>
            <p className="text-xs text-slate-500">
              Reusable defaults for office, treasury, budget heads, drawing officer, and employee template.
            </p>
          </div>
        </div>
        <GTR30SettingsSyncBadge />
      </div>

      <div className="max-w-5xl mx-auto">
        <GTR30SettingsView />
      </div>
    </div>
  );
}
