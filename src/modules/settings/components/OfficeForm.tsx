import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { officeDetailsSchema, type OfficeDetailsInput } from '../validation/settings.schema';
import { useOfficeDetails } from '../hooks/useOfficeDetails';

type OfficeFormValues = z.input<typeof officeDetailsSchema>;

export function OfficeForm() {
  const { details, isLoading, saveAsync } = useOfficeDetails();
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OfficeFormValues>({
    resolver: zodResolver(officeDetailsSchema),
    defaultValues: {
      officeName: '',
      subtitle: '',
      address: '',
      phone: '',
      email: '',
      gst: '',
      tan: '',
    },
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (details) {
      reset(details);
    }
  }, [details, reset]);

  const onSubmit = async (data: OfficeFormValues) => {
    try {
      setSubmitStatus({ type: 'info', message: 'Saving...' });
      await saveAsync(data as OfficeDetailsInput);
      setSubmitStatus({ type: 'success', message: 'Office details saved successfully.' });
      setTimeout(() => setSubmitStatus(null), 3000);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : error && typeof error === 'object' && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Failed to save office details';
      setSubmitStatus({ type: 'error', message });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="spinner h-8 w-8"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="officeName" className="label">Office Name</label>
          <input
            id="officeName"
            {...register('officeName')}
            className="input"
            placeholder="Deputy Director of Animal Husbandry"
          />
          {errors.officeName && <p className="text-red-500 text-sm mt-1">{errors.officeName.message}</p>}
        </div>

        <div>
          <label htmlFor="subtitle" className="label">Subtitle</label>
          <input
            id="subtitle"
            {...register('subtitle')}
            className="input"
            placeholder="Subtitle for reports"
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
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
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
        <button type="reset" className="btn btn-secondary">
          Reset
        </button>
      </div>
    </form>
  );
}
