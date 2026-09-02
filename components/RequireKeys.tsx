export async function RequireKeys({ children }: { children: React.ReactNode }) {
  // Sin claves se muestran fixtures (aviso en el nav). Ya no se bloquea la página.
  return <>{children}</>;
}
