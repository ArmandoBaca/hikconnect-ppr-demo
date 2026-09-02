"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeDeviceCode } from "@/app/settings/actions";

function mask(code: string): string {
  if (code.length <= 2) return "••••";
  return `${code[0]}••••${code[code.length - 1]}`;
}

// Lista los códigos guardados en la cookie cifrada del navegador con opción
// de borrarlos (la cámara vuelve a pedir código al abrir el live).
export function DeviceCodeList({ codes }: { codes: Record<string, string> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const serials = Object.keys(codes).sort();

  if (serials.length === 0) {
    return <p className="mono">Ningún código guardado todavía en este navegador.</p>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Serial del dispositivo</th>
          <th>Código</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {serials.map((serial) => (
          <tr key={serial}>
            <td className="mono">{serial}</td>
            <td className="mono">{mask(codes[serial])}</td>
            <td>
              <button
                className="btn ghost sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const res = await removeDeviceCode(serial);
                    if (res.ok) router.refresh();
                  })
                }
              >
                Eliminar
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
