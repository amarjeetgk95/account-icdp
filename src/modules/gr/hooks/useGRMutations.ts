import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/core/auth/store';
import { grRepositoryService } from '../services/grRepository.service';
import { useToast } from '@/hooks/use-toast';
import type { GRFormData } from '../types';

export function useGRMutations() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['gr_list'] });
    queryClient.invalidateQueries({ queryKey: ['gr_detail'] });
    queryClient.invalidateQueries({ queryKey: ['gr_audit_logs'] });
  };

  const createMutation = useMutation({
    mutationFn: ({
      formData,
      onProgress,
    }: {
      formData: GRFormData;
      onProgress?: (percent: number) => void;
    }) => grRepositoryService.createGR(formData, user, onProgress),
    onSuccess: (data) => {
      invalidateAll();
      toast({
        title: 'GR Added Successfully',
        description: `${data.visibility === 'private' ? 'Private' : 'Public'} Government Resolution "${data.gr_number}" has been saved.`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Unable to Add GR',
        description: err.message || 'An error occurred while uploading the document.',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: Partial<GRFormData> }) =>
      grRepositoryService.updateGR(id, formData, user),
    onSuccess: (data) => {
      invalidateAll();
      toast({
        title: 'GR Updated Successfully',
        description: `Resolution "${data.gr_number}" metadata updated.`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Unable to Update GR',
        description: err.message || 'Failed to update resolution details.',
        variant: 'destructive',
      });
    },
  });

  const replacePdfMutation = useMutation({
    mutationFn: ({
      id,
      newFile,
      onProgress,
    }: {
      id: string;
      newFile: File;
      onProgress?: (percent: number) => void;
    }) => grRepositoryService.replacePDF(id, newFile, user, onProgress),
    onSuccess: (data) => {
      invalidateAll();
      toast({
        title: 'PDF Replaced Successfully',
        description: `New PDF document uploaded for "${data.gr_number}".`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'PDF Replacement Failed',
        description: err.message || 'Could not replace the PDF document.',
        variant: 'destructive',
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => grRepositoryService.archiveGR(id, user),
    onSuccess: (data) => {
      invalidateAll();
      toast({
        title: 'GR Archived Successfully',
        description: `Resolution "${data.gr_number}" has been moved to archive.`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Unable to Archive GR',
        description: err.message || 'Failed to archive resolution.',
        variant: 'destructive',
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => grRepositoryService.restoreGR(id, user),
    onSuccess: (data) => {
      invalidateAll();
      toast({
        title: 'GR Restored Successfully',
        description: `Resolution "${data.gr_number}" has been restored to active list.`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Unable to Restore GR',
        description: err.message || 'Failed to restore resolution.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => grRepositoryService.deleteGR(id, user),
    onSuccess: () => {
      invalidateAll();
      toast({
        title: 'GR Permanently Deleted',
        description: 'Document metadata and storage file have been permanently removed.',
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Deletion Failed',
        description: err.message || 'Only Administrators can permanently delete GR documents.',
        variant: 'destructive',
      });
    },
  });

  return {
    createGR: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    updateGR: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    replacePDF: replacePdfMutation.mutateAsync,
    isReplacingPDF: replacePdfMutation.isPending,

    archiveGR: archiveMutation.mutateAsync,
    isArchiving: archiveMutation.isPending,

    restoreGR: restoreMutation.mutateAsync,
    isRestoring: restoreMutation.isPending,

    deleteGR: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
