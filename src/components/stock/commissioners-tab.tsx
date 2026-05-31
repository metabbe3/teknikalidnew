export interface CommissionerData {
  name: string;
  position: string | null;
  independent: boolean;
}

export function CommissionersTab({ commissioners }: { commissioners: CommissionerData[] }) {
  if (commissioners.length === 0) {
    return (
      <div className="indicator-card depth-shadow p-6 text-center text-text-secondary text-sm">
        Data komisaris tidak tersedia
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {commissioners.map((c, i) => (
        <div key={i} className="indicator-card depth-shadow p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-text-primary">{c.name}</p>
            {c.independent && (
              <span className="text-[10px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                Independen
              </span>
            )}
          </div>
          {c.position && (
            <p className="text-xs text-text-secondary mt-1">{c.position}</p>
          )}
        </div>
      ))}
    </div>
  );
}
