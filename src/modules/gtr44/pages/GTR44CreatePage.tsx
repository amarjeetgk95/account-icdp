import { useParams, useNavigate } from 'react-router-dom';
import { GTR44BillWizard } from '../components/GTR44BillWizard';
import { useGTR44Bill, useCreateGTR44Bill, useUpdateGTR44Bill } from '../hooks/useGTR44';
import { GTR44Bill, GTR44FormData } from '../types';
import { buildNewBillFormData } from '../store/gtr44SettingsStore';
import { formDataToBill } from '../services/gtr44Mapping.service';
import { SkeletonCard } from '../../../shared/components/Skeleton';
import { useToast } from '../../../hooks/use-toast';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';

export function GTR44CreatePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isEditMode = !!id;
  const { data: bill, isLoading } = useGTR44Bill(id || '');
  const createBill = useCreateGTR44Bill();
  const updateBill = useUpdateGTR44Bill();

  const handleSubmit = async (formData: GTR44FormData) => {
    try {
      const now = new Date().toISOString();
      const billData: Partial<GTR44Bill> = formDataToBill(
        formData,
        isEditMode ? bill?.status : 'draft'
      );

      if (isEditMode && id) {
        await updateBill.mutateAsync({ id, bill: billData });
        toast({ title: 'Success', description: 'Bill updated successfully.' });
      } else {
        await createBill.mutateAsync({
          ...billData,
          id: crypto.randomUUID(),
          createdDate: now,
          updatedDate: now,
        } as GTR44Bill);
        toast({ title: 'Success', description: 'Bill created successfully.' });
      }
      navigate('/gtr44/list');
    } catch {
      toast({ title: 'Error', description: 'Failed to save bill.', variant: 'destructive' });
    }
  };

  const initialFormData = isEditMode && bill?.formData ? bill.formData : buildNewBillFormData();

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <WorkspaceHeader
        eyebrow="Bill creation · GTR-44"
        title={isEditMode ? 'Edit detailed contingent bill' : 'Create detailed contingent bill'}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/gtr44/list')} className="gap-1 font-medium">
            <ChevronLeft className="h-4 w-4" /> Back to Register
          </Button>
        }
      />

      {isEditMode && isLoading ? (
        <div className="max-w-6xl mx-auto space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="max-w-6xl mx-auto">
          <GTR44BillWizard
            initialData={initialFormData}
            onSubmit={handleSubmit}
            isSubmitting={createBill.isPending || updateBill.isPending}
          />
        </div>
      )}
    </div>
  );
}
