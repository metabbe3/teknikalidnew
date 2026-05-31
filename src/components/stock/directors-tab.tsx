export interface DirectorData {
  name: string;
  position: string;
  type: string;
  independent: boolean;
}

export function DirectorsTab({ directors }: { directors: DirectorData[] }) {
  if (directors.length === 0) {
    return (
      <div className="indicator-card depth-shadow p-6 text-center text-text-secondary text-sm">
        Data direksi tidak tersedia
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {directors.map((d, i) => (
        <div key={i} className="indicator-card depth-shadow p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-text-primary">{d.name}</p>
            {!d.independent && (
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full whitespace-nowrap border border-amber-200">
                Afiliasi
              </span>
            )}
          </div>
          {d.position && (
            <p className="text-xs text-text-secondary mt-1">{d.position}</p>
          )}
        </div>
      ))}
    </div>
  );
}
