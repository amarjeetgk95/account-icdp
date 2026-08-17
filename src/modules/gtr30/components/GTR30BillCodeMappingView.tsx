import { useState } from 'react';
import type { GTR30BillCodeMapping } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Plus, Trash2, AlertCircle } from 'lucide-react';
import {
  useGTR30BillCodeMappings,
  useSaveGTR30BillCodeMapping,
  useRemoveGTR30BillCodeMapping,
} from '../hooks/useGTR30BillCodeMappings';

export function GTR30BillCodeMappingView() {
  const { toast } = useToast();
  const mappingsQuery = useGTR30BillCodeMappings();
  const saveMutation = useSaveGTR30BillCodeMapping();
  const removeMutation = useRemoveGTR30BillCodeMapping();
  const billCodeMappings = mappingsQuery.data ?? [];
  const [codeErrors, setCodeErrors] = useState<Record<string, string>>({});

  const updateMapping = (id: string, field: keyof GTR30BillCodeMapping, value: string) => {
    const mapping = billCodeMappings.find((m) => m.id === id);
    if (!mapping) return;

    if (field === 'billCode' && !value.trim()) {
      setCodeErrors((prev) => ({ ...prev, [id]: 'Bill code is required' }));
      return;
    }
    if (field === 'billCode' && value.trim().length > 50) {
      setCodeErrors((prev) => ({ ...prev, [id]: 'Bill code must be at most 50 characters' }));
      return;
    }
    setCodeErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    void saveMutation.mutateAsync({ ...mapping, [field]: value.trim().toUpperCase() });
  };

  const addMapping = () => {
    void saveMutation
      .mutateAsync({
        id: crypto.randomUUID(),
        billCode: '',
        description: '',
      })
      .then(() => {
        toast({ title: 'Bill Code Added', description: 'Enter the code and description.' });
      });
  };

  const removeMapping = (id: string) => {
    void removeMutation.mutateAsync(id).then(() => {
      toast({ title: 'Bill Code Removed', description: 'Removed from mappings.' });
    });
  };

  return (
    <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <h2 className="font-bold text-md text-slate-900">Bill Code Mappings</h2>
        </div>
        <Button size="sm" variant="outline" onClick={addMapping}>
          <Plus className="h-4 w-4 mr-1" /> Add Bill Code
        </Button>
      </div>
      <div className="space-y-3">
        {billCodeMappings.map((mapping) => (
          <div key={mapping.id} className="grid gap-2 sm:grid-cols-7 items-center bg-slate-50 p-3 rounded-lg border">
            <div className="sm:col-span-2">
              <Label className="text-xs">Bill Code</Label>
              <Input
                value={mapping.billCode}
                onChange={(e) => updateMapping(mapping.id, 'billCode', e.target.value)}
                placeholder="e.g. GTR30-SAL"
                className={codeErrors[mapping.id] ? 'border-red-400 focus-visible:ring-red-400' : ''}
              />
              {codeErrors[mapping.id] && (
                <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
                  <AlertCircle className="h-3 w-3" /> {codeErrors[mapping.id]}
                </p>
              )}
            </div>
            <div className="sm:col-span-4">
              <Label className="text-xs">Description</Label>
              <Input
                value={mapping.description}
                onChange={(e) => updateMapping(mapping.id, 'description', e.target.value)}
                placeholder="e.g. GTR-30 Salary Bill"
              />
            </div>
            <div className="flex justify-end">
              {billCodeMappings.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 mt-5"
                  onClick={() => removeMapping(mapping.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">Changes save automatically.</p>
    </Card>
  );
}
