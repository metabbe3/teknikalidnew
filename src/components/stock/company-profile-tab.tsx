import { formatPrice } from "@/lib/utils";

export interface CompanyProfileData {
  industry: string | null;
  subIndustry: string | null;
  subSector: string | null;
  listingBoard: string | null;
  listingDate: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
}

export function CompanyProfileTab({ data }: { data: CompanyProfileData }) {
  const classificationRows: [string, string | null][] = [
    ["Industri", data.industry],
    ["Sub-Industri", data.subIndustry],
    ["Sub-Sektor", data.subSector],
    ["Papan Pencatatan", data.listingBoard],
    ["Tanggal Pencatatan", data.listingDate],
  ];

  const contactRows: [string, string | null, "text" | "email" | "url"][] = [
    ["Alamat", data.address, "text"],
    ["Telepon", data.phone, "text"],
    ["Email", data.email, "email"],
    ["Website", data.website, "url"],
  ];

  const hasClassification = classificationRows.some(([, v]) => v !== null);
  const hasContact = contactRows.some(([, v]) => v !== null);

  if (!hasClassification && !hasContact) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {hasClassification && (
        <div className="indicator-card depth-shadow p-4">
          <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">
            Klasifikasi
          </h3>
          <div className="space-y-0" role="list">
            {classificationRows.map(([label, value]) => (
              <div key={label} className="flex justify-between py-2 text-[13px] border-b border-border/30 last:border-0" role="listitem">
                <span className="text-text-secondary">{label}</span>
                <span className="font-medium text-right">{value ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {hasContact && (
        <div className="indicator-card depth-shadow p-4">
          <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">
            Kontak
          </h3>
          <div className="space-y-0" role="list">
            {contactRows.map(([label, value, type]) => (
              <div key={label} className="flex justify-between py-2 text-[13px] border-b border-border/30 last:border-0 gap-4" role="listitem">
                <span className="text-text-secondary shrink-0">{label}</span>
                {type === "email" && value ? (
                  <a href={`mailto:${value}`} className="text-accent hover:underline truncate text-right">{value}</a>
                ) : type === "url" && value ? (
                  <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline truncate text-right">{value}</a>
                ) : (
                  <span className="font-medium text-right truncate">{value ?? "—"}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
