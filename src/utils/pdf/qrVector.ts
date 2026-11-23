import QRCode from 'qrcode';
import type { CompanySettings, Employee, QrMode } from '../../types.ts';

export interface QrMatrix {
  size: number;
  modules: boolean[][];
  payload: string;
}

export function buildCardPublicUrl(employeeId: string, origin?: string): string {
  const base =
    origin ||
    (typeof window !== 'undefined' && window.location.origin
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://contact.magmahome.ru/');
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  return `${cleanBase}?card=${encodeURIComponent(employeeId)}`;
}

export function buildVcardQrPayload(employee: Employee, settings: CompanySettings): string {
  const phone = employee.phone?.trim() || settings.companyPhone?.trim() || '';
  const website = (employee.website?.trim() || settings.companyWebsite?.trim() || '').replace(
    /^https?:\/\//i,
    ''
  );
  const address = employee.address?.trim() || settings.companyAddress?.trim() || '';
  const fullName = `${employee.firstName} ${employee.lastName}`.trim();

  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${employee.lastName};${employee.firstName};;;`,
    `FN:${fullName}`,
    `ORG:${settings.companyName || 'Magma Home'}`,
    employee.title ? `TITLE:${employee.title}` : '',
    phone ? `TEL;TYPE=CELL:${phone}` : '',
    employee.email ? `EMAIL;TYPE=WORK:${employee.email}` : '',
    website ? `URL:https://${website}` : '',
    address ? `ADR;TYPE=WORK:;;${address};;;;` : '',
    'END:VCARD',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildQrPayload(
  employee: Employee,
  settings: CompanySettings,
  mode: QrMode,
  origin?: string
): string {
  if (mode === 'vcard') {
    return buildVcardQrPayload(employee, settings);
  }
  return buildCardPublicUrl(employee.id, origin);
}

export function createQrMatrix(payload: string): QrMatrix {
  const qr = QRCode.create(payload, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const modules: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c++) {
      row.push(Boolean(qr.modules.get(r, c)));
    }
    modules.push(row);
  }
  return { size, modules, payload };
}
