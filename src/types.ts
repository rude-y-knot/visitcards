export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  title: string;
  website: string;
  address: string;
  department: string;
  telegram?: string;
  whatsapp?: string;
  maxMessenger?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanySettings {
  companyName: string;
  companyPhone: string;
  companyWebsite: string;
  companyAddress: string;
}

export type CardOrientation = 'horizontal' | 'vertical';
export type CardSides = 'single' | 'double';
export type CardTemplate = 'brand-dark' | 'classic-light' | 'contrast-back' | 'minimal-grid';
export type QrMode = 'card-url' | 'vcard';

export interface PdfFieldVisibility {
  showDepartment: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showWebsite: boolean;
  showAddress: boolean;
  showTelegram: boolean;
  showQr: boolean;
}

export interface PdfPrepressOptions {
  bleedMm: 0 | 2 | 3;
  convertTextToOutlines: boolean;
  cropMarks: boolean;
  showGuidesInPreview: boolean;
}

export interface PdfCardConfig {
  employeeId: string;
  overrides: Partial<Employee>;
  orientation: CardOrientation;
  sides: CardSides;
  template: CardTemplate;
  qrMode: QrMode;
  visibility: PdfFieldVisibility;
  prepress: PdfPrepressOptions;
}
