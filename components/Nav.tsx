import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { effectiveMode, hasHctKeys } from "@/lib/settings";
import { LogoutButton } from "./LogoutButton";

export async function Nav() {
  const session = await getSession();
  if (!session) return null;

  const [mode, hasKeys] = await Promise.all([effectiveMode(), hasHctKeys()]);
  const keysMissing = !hasKeys;

  return (
    <nav className="nav">
      <Link href="/" className="brand">
        SYSCOM <span>POC</span>
      </Link>
      <Link href="/cameras">Cámaras</Link>
      <Link href="/doors">Puertas</Link>
      <Link href="/persons">Personas</Link>
      <Link href="/levels">Niveles</Link>
      <Link href="/events">Marcaciones</Link>
      <Link href="/settings">Configuración</Link>
      {mode === "mock" && (
        <Link
          href={keysMissing ? "/settings#claves" : "/settings"}
          className="nav-sim"
          title={
            keysMissing
              ? "Captura AppKey y SecretKey para usar el tenant real"
              : "El modo de operación está en mock; cámbialo a live en Configuración"
          }
        >
          {keysMissing
            ? "Resultados simulados — configurar API"
            : "Resultados simulados — modo mock"}
        </Link>
      )}
      <div className="spacer" />
      <span className="user">
        {session.username} · {session.role}
      </span>
      <LogoutButton />
    </nav>
  );
}
