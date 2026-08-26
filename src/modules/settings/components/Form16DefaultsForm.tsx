import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { form16DefaultsSchema, type Form16DefaultsInput } from '../validation/settings.schema';
import { useForm16Defaults } from '@/modules/paybill/hooks/useForm16';
import { useOfficeDetails } from '../hooks/useOfficeDetails';
import { SkeletonCard } from '@/shared/components/Skeleton';

type Form16FormValues = z.input<typeof form16DefaultsSchema>;

const EMPTY: Form16FormValues = {
  employerName: '',
  employerAddress: '',
  employerPan: '',
  employerTan: '',
  citTds: '',
  signatoryName: '',
  signatoryDesignation: '',
  signatoryPlace: '',
};

/**
 * Office-wide Form 16 defaults (deductor identity + signing officer).
 * Saved once here and auto-applied to every new Form 16 certificate.
 */
export function Form16DefaultsForm() {
  const { defaults, isLoading: isF16Loading, saveAsync, isSaving } = useForm16Defaults();
  const { details: officeDetails, isLoading: isOfficeLoading } = useOfficeDetails();
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Form16FormValues>({
    resolver: zodResolver(form16DefaultsSchema),
    defaultValues: EMPTY,
    mode: 'onSubmit',
  });

  useEffect(() => {
    const fallbackName = officeDetails?.officeName || '';
    const fallbackAddress = officeDetails?.address || '';
    const fallbackTan = officeDetails?.tan || '';

    if (defaults) {
      reset({
        ...EMPTY,
        ...defaults,
        employerName: defaults.employerName || fallbackName,
        employerAddress: defaults.employerAddress || fallbackAddress,
        employerTan: defaults.employerTan || fallbackTan,
      });
    } else if (officeDetails) {
      reset({
        ...EMPTY,
        employerName: fallbackName,
        employerAddress: fallbackAddress,
        employerTan: fallbackTan,
      });
    }
  }, [defaults, officeDetails, reset]);

  const onSubmit = async (data: Form16FormValues) => {
    try {
      setSubmitStatus({ type: 'info', message: 'Saving...' });
      await saveAsync(data as Form16DefaultsInput);
      setSubmitStatus({ type: 'success', message: 'Form 16 defaults saved. New certificates will use these values.' });
      setTimeout(() => setSubmitStatus(null), 3000);
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save Form 16 defaults',
      });
    }
  };

  if (isF16Loading || isOfficeLoading) return <SkeletonCard />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        These common details are applied automatically to every Form 16 certificate for this office.
        They can still be overridden per certificate in the Employee IT &rarr; Form-16 page.
      </p>

      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
        Employer / Deductor
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label htmlFor="employerName" className="label">Office Name (Deductor)</label>
          <textarea
            id="employerName"
            {...register('employerName')}
            rows={2}
            className="input resize-y min-h-[58px]"
            placeholder="Office of the Deputy Director of Animal Husbandry&#10;ICDP, Surat"
          />
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Press <strong>Enter</strong> to create a two-line office name (e.g. Line 1: Main Office, Line 2: Division / Scheme).
          </p>
        </div>

        <div>
          <label htmlFor="citTds" className="label">CIT(TDS)</label>
          <input
            id="citTds"
            {...register('citTds')}
            className="input"
            placeholder="CIT(TDS), Surat"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="employerAddress" className="label">Deductor Office Address</label>
          <input
            id="employerAddress"
            {...register('employerAddress')}
            className="input"
            placeholder="Jilla Seva Sadan-2, Athwalines, Surat - 395001"
          />
        </div>

        <div>
          <label htmlFor="employerPan" className="label">Deductor PAN</label>
          <input
            id="employerPan"
            {...register('employerPan')}
            className="input font-mono uppercase"
            placeholder="AAAGD00000A"
            maxLength={10}
          />
          {errors.employerPan && <p className="text-red-500 text-xs mt-1">{errors.employerPan.message}</p>}
        </div>

        <div>
          <label htmlFor="employerTan" className="label">Deductor TAN</label>
          <input
            id="employerTan"
            {...register('employerTan')}
            className="input font-mono uppercase"
            placeholder="SRTD00979G"
            maxLength={10}
          />
          {errors.employerTan && <p className="text-red-500 text-xs mt-1">{errors.employerTan.message}</p>}
        </div>
      </div>

      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 pt-2">
        Default Signing Officer
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="signatoryName" className="label">Name</label>
          <input
            id="signatoryName"
            {...register('signatoryName')}
            className="input"
            placeholder="Full name of signing officer"
          />
        </div>

        <div>
          <label htmlFor="signatoryDesignation" className="label">Designation</label>
          <input
            id="signatoryDesignation"
            {...register('signatoryDesignation')}
            className="input"
            placeholder="Assistant Administrative cum Account Officer"
          />
        </div>

        <div>
          <label htmlFor="signatoryPlace" className="label">Place</label>
          <input
            id="signatoryPlace"
            {...register('signatoryPlace')}
            className="input"
            placeholder="Surat"
          />
        </div>
      </div>

      {submitStatus && (
        <div
          className={`alert alert-${
            submitStatus.type === 'success' ? 'success' : submitStatus.type === 'error' ? 'danger' : 'info'
          }`}
        >
          {submitStatus.message}
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={isSaving} className="btn btn-primary">
          {isSaving ? 'Saving...' : 'Save Form 16 Defaults'}
        </button>
        <button type="button" onClick={() => reset({ ...EMPTY, ...defaults })} className="btn btn-secondary">
          Reset
        </button>
      </div>
    </form>
  );
}
