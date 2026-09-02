"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveHctField } from "@/app/settings/actions";

// Valor editable inline: se ve como texto (enmascarado si es secreto) y al
// hacer clic se convierte en cuadro de texto. Enter guarda, Esc cancela.
// En secretos el input arranca vacio (nunca se revela el valor actual).
export function EditableValue({
  field,
  display,
  secret = false,
}: {
  field: "host" | "appKey" | "secretKey";
  display: string;
  secret?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "warn" } | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    if (!value.trim()) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      try {
        const res = await saveHctField(field, value);
        if (!res.ok) {
          setMessage({ text: res.error ?? "Error guardando", tone: "warn" });
          return;
        }
        setEditing(false);
        setValue("");
        setMessage({ text: res.warning ?? "Guardado", tone: res.warning ? "warn" : "ok" });
        router.refresh();
        setTimeout(() => setMessage(null), res.warning ? 8000 : 3000);
      } catch (err) {
        setMessage({ text: err instanceof Error ? err.message : "Error", tone: "warn" });
      }
    });
  }

  if (!editing) {
    return (
      <span className="row" style={{ gap: 8 }}>
        <button
          type="button"
          className="editable-value mono"
          title="Clic para editar"
          onClick={() => {
            setEditing(true);
            setValue(secret ? "" : display);
            setMessage(null);
          }}
        >
          {display}
        </button>
        {message && <span className={`badge ${message.tone}`}>{message.text}</span>}
      </span>
    );
  }

  return (
    <span className="row" style={{ gap: 8 }}>
      <input
        className="input mono"
        style={{ maxWidth: 340, margin: 0 }}
        type={secret ? "password" : "text"}
        placeholder={secret ? "Nuevo valor…" : ""}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") setEditing(false);
        }}
        autoFocus
        disabled={pending}
        autoComplete="off"
      />
      <button type="button" className="btn sm" onClick={save} disabled={pending}>
        {pending ? "…" : "Guardar"}
      </button>
      <button type="button" className="btn ghost sm" onClick={() => setEditing(false)} disabled={pending}>
        Cancelar
      </button>
      {message && <span className={`badge ${message.tone}`}>{message.text}</span>}
    </span>
  );
}
