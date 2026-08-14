import { useParams, useNavigate } from 'react-router-dom';
import { GTR44BillWizard } from '../components/GTR44BillWizard';
import { useGTR44Bill, useCreateGTR44Bill, useUpdateGTR44Bill } from '../hooks/useGTR44';
import { GTR44Bill, GTR44FormData, GTR44Entry } from '../types';
import { DEFAULT_GTR44_FORM_DATA } from '../store/gtr44Store';
import { SkeletonCard } from '../../../shared/components/Skeleton';
import { useToast } from '../../../hooks/use-toast';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../../../components/ui/button';

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
       const entries: GTR44Entry[] = formData.partyEntries || [];
       const grossAmount = entries.reduce((sum: number, e: GTR44Entry) => sum + (e.amount || 0), 0);
       const totalDeduction =
        (formData.deductions.tds9510 || 0) +
        (formData.deductions.surcharge9520 || 0) +
        (formData.deductions.sd9600 || 0) +
        (formData.deductions.misc9910 || 0);
      const netAmount = Math.max(0, grossAmount - totalDeduction);

      const billData: Partial<GTR44Bill> = {
        billNo: formData.billRegisterNo || `GTR44-${Date.now()}`,
        billDate: formData.billRegisterDate || new Date().toISOString().split('T')[0],
        tokenNo: formData.tokenNo1,
        tokenDate: formData.tokenDate1,
        officeName: formData.officeName,
        ddoCardexCode: formData.ddoCardexCode,
        fy: parseInt(formData.budgetGrantYearFrom) || new Date().getFullYear(),
        month: formData.monthOf,
        district: formData.district,
        sector: formData.sector,
        demandNo: formData.demandNo,
        majorHead: formData.majorHead,
        subMajorHead: formData.subMajorHead,
        minorHead: formData.minorHead,
        subHead: formData.subHead,
        detailedHead: formData.detailedHead,
        edpCode: formData.expenditureItems[0]?.edpCode || '',
        budgetAllotment: formData.budgetGrant || 0,
        ytdExpenditure: formData.expenditureIncludingBill || 0,
        availableBalance: formData.balance || 0,
        subVouchers: entries.map((e: GTR44Entry, i: number) => ({
          id: e.id,
          subVoucherNo: e.subVoucherNo || String(i + 1),
          payeeName: e.partyName,
          description: e.details,
          sanctionOrderNo: e.sanctionOrderNo,
          sanctionDate: e.sanctionDate,
          amount: e.amount,
        })),
        deductions: [
          { code: '9510', label: 'Income Tax', amount: formData.deductions.tds9510 || 0 },
          { code: '9520', label: 'Surcharge', amount: formData.deductions.surcharge9520 || 0 },
          { code: '9600', label: 'Security Deposit', amount: formData.deductions.sd9600 || 0 },
          { code: '9910', label: 'Misc Recoveries', amount: formData.deductions.misc9910 || 0 },
        ],
        grossAmount,
        totalDeduction,
        netAmount,
        status: 'draft' as const,
        formData,
      };

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

  if (isEditMode && isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  const initialFormData = isEditMode && bill?.formData ? bill.formData : DEFAULT_GTR44_FORM_DATA;

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" className="mr-4" onClick={() => navigate('/gtr44/list')}>
          <ChevronLeft className="h-5 w-5 mr-1" /> Back
        </Button>
        <h1 className="text-3xl font-bold">
          {isEditMode ? 'Edit GTR-44 Bill' : 'Create GTR-44 Detailed Contingent Bill'}
        </h1>
      </div>

      <div className="max-w-6xl mx-auto">
        <GTR44BillWizard 
          initialData={initialFormData} 
          onSubmit={handleSubmit}
          isSubmitting={createBill.isPending || updateBill.isPending}
        />
      </div>
    </div>
  );
}
