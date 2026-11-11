export interface PostCatalogItem {
  id: string;
  nameGu: string;
  nameEn: string;
  cadreClass: 'Class-1' | 'Class-2' | 'Class-3' | 'Class-4';
  payLevel: string;
  payScale: string;
  minPay: number;
  remarks?: string;
  isActive: boolean;
  displayOrder?: number;
}

export interface PostCatalogFormInput {
  nameGu: string;
  nameEn: string;
  cadreClass: 'Class-1' | 'Class-2' | 'Class-3' | 'Class-4';
  payLevel: string;
  payScale: string;
  minPay: number;
  remarks?: string;
  syncExistingPositions?: boolean;
}
