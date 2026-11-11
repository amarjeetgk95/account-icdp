import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { officeDetailsSchema, type OfficeDetailsInput } from '../validation/settings.schema';
import { useOfficeDetails } from '../hooks/useOfficeDetails';
import { SkeletonCard } from '@/shared/components/Skeleton';

type OfficeFormValues = z.input<typeof officeDetailsSchema>;

const EMPTY_FORM: OfficeFormValues = {
  officeName: '',
  subtitle: '',
  departmentDivision: '',
  district: '',
  address: '',
  phone: '',
  email: '',
  gst: '',
  tan: '',
};

export function OfficeForm() {
  const { details, isLoading, isError, error, refetch, saveAsync } = useOfficeDetails();
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const initializedRef = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<OfficeFormValues>({
    resolver: zodResolver(officeDetailsSchema),
    defaultValues: EMPTY_FORM,
    mode: 'onSubmit',
  });

  // Initial load only: populate the form once. Previously this reset on
  // EVERY details change, so a failed/slow refetch after save could wipe
  // the user's just-typed values and look like "saved then gone".
  useEffect(() => {
    if (details && !initializedRef.current) {
      reset(details);
      initializedRef.current = true;
    }
  }, [details, reset]);

  const onSubmit = async (data: OfficeFormValues) => {
    try {
      setSubmitStatus({ type: 'info', message: 'Saving...' });
      const input = data as OfficeDetailsInput;
      await saveAsync(input);
      // Keep the saved values in the form (clears dirty flag) so a
      // subsequent refetch can never blank the UI.
      reset(input);
      // Verify persistence: re-read from the DB. If this returns empty or
      // errors, the write didn't stick (RLS / duplicates / wrong project)
      // and we warn instead of showing a false "saved successfully".
      const refreshed = await refetch();
      if (refreshed.isError) {
        throw refreshed.error ?? new Error('Save completed but re-read from database failed.');
      }
      const reloaded = refreshed.data;
      const looksEmpty =
        reloaded &&
        !reloaded.officeName &&
        !reloaded.address &&
        (input.officeName || input.address);
      if (looksEmpty) {
        setSubmitStatus({
          type: 'error',
          message:
            'Saved but re-read returned empty — check Supabase office_details rows / RLS policies (see console). Your values are kept in the form.',
        });
        return;
      }
      setSubmitStatus({ type: 'success', message: 'Office details saved successfully.' });
      setTimeout(() => setSubmitStatus(null), 3000);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : submitError && typeof submitError === 'object' && 'message' in submitError
            ? String((submitError as { message: unknown }).message)
            : 'Failed to save office details';
      setSubmitStatus({ type: 'error', message });
    }
  };

  if (isLoading) {
    return <SkeletonCard />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {isError && (
        <div className="alert alert-danger">
          Failed to load office details:{' '}
          {error instanceof Error ? error.message : 'Unknown error'}. Your edits are kept locally.
          <button type="button" className="btn btn-secondary ml-2" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="officeName" className="label">Office Name</label>
          <input
            id="officeName"
            {...register('officeName')}
            className="input"
            placeholder="Deputy Director of Animal Husbandry"
          />
          {errors.officeName && <p className="text-red-500 text-xs mt-1">{errors.officeName.message}</p>}
        </div>

        <div>
          <label htmlFor="subtitle" className="label">Office Part-2 / Subtitle</label>
          <input
            id="subtitle"
            {...register('subtitle')}
            className="input"
            placeholder="Intensive Cattle Development Programme - Surat"
          />
        </div>

        <div>
          <label htmlFor="departmentDivision" className="label">Department / Division</label>
          <input
            id="departmentDivision"
            {...register('departmentDivision')}
            className="input"
            placeholder="Intensive Cattle Development Programme (Ahwa)"
          />
        </div>

        <div>
          <label htmlFor="district" className="label">District</label>
          <input
            id="district"
            {...register('district')}
            className="input"
            placeholder="Dangs"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="address" className="label">Address</label>
          <input
            id="address"
            {...register('address')}
            className="input"
            placeholder="Patel Nagar, A.K. Road, Surat - 395008"
          />
        </div>

        <div>
          <label htmlFor="phone" className="label">Phone Number</label>
          <input
            id="phone"
            {...register('phone')}
            className="input"
            placeholder="(0261) 2464658/59"
          />
        </div>

        <div>
          <label htmlFor="email" className="label">Email ID</label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className="input"
            placeholder="icdpsurat@yahoo.com"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="gst" className="label">GST Number</label>
          <input
            id="gst"
            {...register('gst')}
            className="input"
            placeholder="24SRTD00979G1DD"
          />
        </div>

        <div>
          <label htmlFor="tan" className="label">Income Tax TAN</label>
          <input
            id="tan"
            {...register('tan')}
            className="input"
            placeholder="SRTD00979G"
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
        <button type="submit" disabled={isSubmitting} className="btn btn-primary">
          {isSubmitting ? 'Saving...' : 'Save Office Details'}
        </button>
        <button
          type="button"
          onClick={() => {
            reset(details || EMPTY_FORM);
            setSubmitStatus(null);
          }}
          disabled={isSubmitting || (!isDirty && !!details)}
          className="btn btn-secondary"
        >
          Reset
        </button>
      </div>
    </form>
  );
}
