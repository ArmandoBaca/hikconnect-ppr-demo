import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { hasHctKeys } from "@/lib/settings";
import { LogoutButton } from "./LogoutButton";

export async function Nav() {
  const session = await getSession();
  if (!session) return null;

  const keysMissing = !(await hasHctKeys());

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
      {keysMissing && (
        <Link href="/settings#claves" className="nav-sim" title="Captura AppKey y SecretKey para usar el tenant real">
          Resultados simulados — configurar API
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
