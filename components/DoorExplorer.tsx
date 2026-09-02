"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CameraFilters, type FilterValues } from "@/components/CameraFilters";
import { applyDoorFilters, filtersToQuery } from "@/lib/filters";
import { DoorActions } from "@/components/DoorActions";
import { DeviceForm } from "@/components/DeviceForm";
import { refreshDoors } from "@/app/actions";
import type { Door } from "@/lib/hct/types";

const PAGE = 80;

export function DoorExplorer({
  doors,
  initialFilters,
  isOperator,
}: {
  doors: Door[];
  initialFilters: FilterValues;
  isOperator: boolean;
}) {
  const pathname = usePathname();
  const [filters, setFilters] = useState(initialFilters);
  const [visible, setVisible] = useState(PAGE);

  const areas = useMemo(
    () => [...new Set(doors.map((d) => d.area).filter(Boolean))].sort(),
    [doors],
  );
  const filtered = useMemo(() => applyDoorFilters(doors, filters), [doors, filters]);
  const shown = filtered.slice(0, visible);

  useEffect(() => {
    setVisible(PAGE);
  }, [filters]);

  useEffect(() => {
    const qs = filtersToQuery(filters, false);
    window.history.replaceState(null, "", `${pathname}${qs}`);
  }, [filters, pathname]);

  return (
    <>
      <CameraFilters areas={areas} values={filters} onChange={setFilters} withEncryption={false} />

      <div className="row" style={{ marginBottom: 16 }}>
        <span className="badge ok">{filtered.length} de {doors.length} puertas</span>
        <span className="badge ok">{doors.filter((d) => d.online).length} en línea</span>
        <form action={refreshDoors}>
          <button className="btn ghost sm" type="submit">Actualizar inventario</button>
        </form>
        {isOperator && <DeviceForm defaultCategory="accessControllerDevice" />}
      </div>

      {!isOperator && (
        <div className="alert info">Rol viewer: solo lectura. Los comandos requieren rol operator.</div>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>Puerta</th>
            <th>Área</th>
            <th>Estado</th>
            <th>Dispositivo</th>
            {isOperator && <th>Comandos</th>}
          </tr>
        </thead>
        <tbody>
          {shown.map((d) => (
            <tr key={d.id}>
              <td>
                <Link href={`/doors/${d.id}`}>{d.name}</Link>
              </td>
              <td>{d.area || "—"}</td>
              <td>
                <span className={`badge ${d.online ? "ok" : "off"}`}>
                  {d.online ? "En línea" : "Fuera"}
                </span>
              </td>
              <td className="mono">{d.serial} · ch {d.channel}</td>
              {isOperator && (
                <td>
                  <DoorActions doorId={d.id} doorName={d.name} />
                </td>
              )}
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={isOperator ? 5 : 4} className="mono">
                Ninguna puerta coincide con los filtros.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {visible < filtered.length && (
        <div className="row" style={{ marginTop: 16 }}>
          <button type="button" className="btn ghost" onClick={() => setVisible((n) => n + PAGE)}>
            Mostrar más ({filtered.length - visible} restantes)
          </button>
        </div>
      )}
    </>
  );
}
