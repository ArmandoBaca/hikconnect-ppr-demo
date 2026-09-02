"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CameraFilters, type FilterValues } from "@/components/CameraFilters";
import { applyCameraFilters, filtersToQuery } from "@/lib/filters";
import { SyncEncryptionButton } from "@/components/SyncEncryptionButton";
import { DeviceForm } from "@/components/DeviceForm";
import { refreshCameras } from "@/app/actions";
import type { Camera } from "@/lib/hct/types";

const PAGE = 80;

function EncryptionBadge({ encrypted }: { encrypted?: boolean | null }) {
  if (encrypted === true) return <span className="badge warn">Cifrada</span>;
  if (encrypted === false) return <span className="badge ok">Sin cifrar</span>;
  return <span className="badge off">Cifrado ?</span>;
}

export function CameraExplorer({
  cameras,
  initialFilters,
  isOperator,
}: {
  cameras: Camera[];
  initialFilters: FilterValues;
  isOperator: boolean;
}) {
  const pathname = usePathname();
  const [filters, setFilters] = useState(initialFilters);
  const [visible, setVisible] = useState(PAGE);

  const areas = useMemo(
    () => [...new Set(cameras.map((c) => c.area).filter(Boolean))].sort(),
    [cameras],
  );
  const filtered = useMemo(() => applyCameraFilters(cameras, filters), [cameras, filters]);
  const shown = filtered.slice(0, visible);
  const plain = cameras.filter((c) => c.encrypted === false).length;
  const encrypted = cameras.filter((c) => c.encrypted === true).length;
  const unknown = cameras.length - plain - encrypted;

  useEffect(() => {
    setVisible(PAGE);
  }, [filters]);

  useEffect(() => {
    const qs = filtersToQuery(filters, true);
    window.history.replaceState(null, "", `${pathname}${qs}`);
  }, [filters, pathname]);

  return (
    <>
      <CameraFilters areas={areas} values={filters} onChange={setFilters} />

      <div className="row" style={{ marginBottom: 16 }}>
        <span className="badge ok">{filtered.length} de {cameras.length} cámaras</span>
        <span className="badge ok">{plain} sin cifrar</span>
        <span className="badge warn">{encrypted} cifradas</span>
        <span className="badge off">{unknown} sin dato</span>
        <form action={refreshCameras}>
          <button className="btn ghost sm" type="submit">Actualizar inventario</button>
        </form>
        <SyncEncryptionButton />
        {isOperator && <DeviceForm defaultCategory="encodingDevice" />}
      </div>

      {unknown > 0 && (
        <div className="alert info">
          El listado de HCT no incluye el flag de cifrado: se obtiene por dispositivo con
          "Sincronizar cifrado" (lotes de 50, ~10 s cada uno, sin saturar el límite de 5 req/s).
          Filtra por "Sin cifrar" para encontrar cámaras cuyo live no pide código.
        </div>
      )}

      <div className="grid">
        {shown.map((c) => (
          <Link key={c.id} href={`/cameras/${c.id}`} className="card" style={{ display: "block" }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h3>{c.name}</h3>
              <span className={`badge ${c.online ? "ok" : "off"}`}>{c.online ? "En línea" : "Fuera"}</span>
            </div>
            <div className="meta">{c.area || "Sin área"}</div>
            <div className="mono">serial {c.serial} · canal {c.channel}</div>
            <div style={{ marginTop: 8 }}>
              <EncryptionBadge encrypted={c.encrypted} />
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="card mono">Ninguna cámara coincide con los filtros.</div>
        )}
      </div>

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
