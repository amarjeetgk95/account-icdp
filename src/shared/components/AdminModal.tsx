import type { ReactNode } from 'react';
import { Modal } from './Modal';

type WidthMap = 'max-w-sm' | 'max-w-md' | 'max-w-lg' | 'max-w-xl' | 'max-w-2xl' | 'max-w-4xl' | 'max-w-5xl';

const WIDTH_MAP: Record<WidthMap, 'sm' | 'md' | 'lg' | 'xl' | 'full'> = {
  'max-w-sm': 'sm',
  'max-w-md': 'md',
  'max-w-lg': 'lg',
  'max-w-xl': 'lg',
  'max-w-2xl': 'xl',
  'max-w-4xl': 'xl',
  'max-w-5xl': 'full',
};

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: WidthMap;
}

export function AdminModal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: AdminModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth={WIDTH_MAP[maxWidth] ?? 'lg'}
    >
      {children}
    </Modal>
  );
}
