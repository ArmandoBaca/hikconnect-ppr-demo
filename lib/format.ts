// Las marcaciones se pintan en Server Components y en Vercel el proceso corre
// en UTC: sin zona explicita las horas salian 6 h adelantadas.
const TIME_ZONE = process.env.POC_TIMEZONE ?? "America/Mexico_City";

const formatter = new Intl.DateTimeFormat("es-MX", {
  timeZone: TIME_ZONE,
  dateStyle: "short",
  timeStyle: "medium",
});

export function formatDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return formatter.format(d);
}
