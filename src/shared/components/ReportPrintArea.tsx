import { ReactNode } from 'react';

interface OfficeDetails {
  officeName: string;
  subtitle: string;
  address: string;
  phone: string;
  email: string;
  gst: string;
  tan: string;
}

interface ReportPrintAreaProps {
  office: OfficeDetails;
  leftLabel: string;
  leftValue: string;
  rightMeta: ReactNode;
  title: string;
  badgeClass?: string;
  footerExtra?: ReactNode;
  children: ReactNode;
}

const DEFAULT_OFFICE: OfficeDetails = {
  officeName: 'Deputy Director of Animal Husbandry',
  subtitle: 'Intensive Cattle Development Programme - Surat',
  address: 'Patel Nagar, A.K. Road, Surat - 395008',
  phone: 'Phone: (0261) 2464658/59',
  email: 'Email: icdpsurat@yahoo.com',
  gst: '24SRTD00979G1DD',
  tan: 'SRTDO0979G',
};

export function ReportPrintArea({
  office,
  leftLabel,
  leftValue,
  rightMeta,
  title,
  badgeClass = 'report-badge-emp',
  footerExtra,
  children,
}: ReportPrintAreaProps) {
  const o = { ...DEFAULT_OFFICE, ...office };
  const addrParts = [];
  if (o.address && o.address.trim()) addrParts.push(o.address);
  if (o.phone && o.phone.trim()) addrParts.push('Phone: ' + o.phone);
  if (o.email && o.email.trim()) addrParts.push('Email: ' + o.email);
  const address = addrParts.length ? addrParts.join(' | ') : DEFAULT_OFFICE.address + ' | ' + DEFAULT_OFFICE.phone;

  return (
    <div className="report-print-area">
      <div className="govt-letterhead">
        <div className="govt-title-primary">{o.officeName || DEFAULT_OFFICE.officeName}</div>
        <div className="govt-title-secondary">{o.subtitle || DEFAULT_OFFICE.subtitle}</div>
        <div className="govt-address-line">{address}</div>
      </div>
      <div className="govt-meta-bar">
        <div>
          {leftLabel} <span className="font-bold">{leftValue || ''}</span>
        </div>
        <div>{rightMeta}</div>
      </div>
      <div className="report-title-container">
        <div className={'report-title-badge ' + badgeClass}>{title}</div>
      </div>
      <div className="report-scroll">{children}</div>
      <div className="govt-footer-signatures">
        <div>Received Date: ___________________</div>
        <div className="sign-right">
          Assistant Administrative cum Account Officer
          <br />
          Intensive Cattle Development Programme - Surat
          {footerExtra}
        </div>
      </div>
    </div>
  );
}
