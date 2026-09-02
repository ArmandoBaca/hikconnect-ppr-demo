"use client";

import type { FilterValues } from "@/lib/filters";

export type { FilterValues };

export function CameraFilters({
  areas,
  values,
  onChange,
  withEncryption = true,
}: {
  areas: string[];
  values: FilterValues;
  onChange: (next: FilterValues) => void;
  withEncryption?: boolean;
}) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="row">
        <input
          className="input"
          style={{ maxWidth: 280 }}
          placeholder="Buscar por nombre o serial…"
          value={values.q}
          onChange={(e) => onChange({ ...values, q: e.target.value })}
        />
        <select
          className="input"
          style={{ maxWidth: 200 }}
          value={values.area}
          onChange={(e) => onChange({ ...values, area: e.target.value })}
        >
          <option value="">Todas las áreas</option>
          {areas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select
          className="input"
          style={{ maxWidth: 160 }}
          value={values.status}
          onChange={(e) => onChange({ ...values, status: e.target.value })}
        >
          <option value="">Estado: todos</option>
          <option value="online">En línea</option>
          <option value="offline">Fuera de línea</option>
        </select>
        {withEncryption && (
          <select
            className="input"
            style={{ maxWidth: 200 }}
            value={values.enc}
            onChange={(e) => onChange({ ...values, enc: e.target.value })}
          >
            <option value="">Cifrado: todos</option>
            <option value="plain">Sin cifrar (live sin código)</option>
            <option value="encrypted">Cifradas (piden código)</option>
            <option value="unknown">Sin dato de cifrado</option>
          </select>
        )}
      </div>
    </div>
  );
}
