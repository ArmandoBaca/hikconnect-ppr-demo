// Tipos de evento de autenticacion del ACS (tabla "Authentication Event" del
// OpenAPI). En la doc van como "Msg110013"; en certificaterecords/search el
// campo eventType llega como entero sin el prefijo.
//
// method = credencial usada (lo que se muestra en la columna Método).
// reason = motivo del rechazo; en los concedidos no aplica.

interface EventMeaning {
  method: string;
  reason?: string;
}

const EVENTS: Record<number, EventMeaning> = {
  110001: { method: "Tarjeta + huella" },
  110002: { method: "Tarjeta + huella + PIN" },
  110003: { method: "Tarjeta" },
  110004: { method: "Tarjeta + PIN" },
  110005: { method: "Huella" },
  110006: { method: "Huella + PIN" },
  110007: { method: "Coacción", reason: "Alarma de coacción" },
  110008: { method: "Rostro + huella" },
  110009: { method: "Rostro + PIN" },
  110010: { method: "Rostro + tarjeta" },
  110011: { method: "Rostro + PIN + huella" },
  110012: { method: "Rostro + tarjeta + huella" },
  110013: { method: "Rostro" },
  110018: { method: "Autenticación combinada" },
  110019: { method: "Temperatura" },
  110020: { method: "Contraseña" },
  110023: { method: "Código QR" },
  110024: { method: "Llavero" },

  110501: { method: "Tarjeta", reason: "Falló el cifrado de la tarjeta" },
  110502: { method: "Tarjeta", reason: "Máximo de intentos con tarjeta" },
  110505: { method: "Tarjeta", reason: "Tarjeta expirada" },
  110506: { method: "Tarjeta + PIN", reason: "Tiempo agotado" },
  110507: { method: "", reason: "Puerta bloqueada o inactiva" },
  110509: { method: "Tarjeta + PIN", reason: "Autenticación incorrecta" },
  110510: { method: "Tarjeta + huella + PIN", reason: "Tiempo agotado" },
  110511: { method: "Tarjeta + huella + PIN", reason: "Autenticación incorrecta" },
  110512: { method: "Tarjeta + huella", reason: "Autenticación incorrecta" },
  110513: { method: "Tarjeta + huella", reason: "Tiempo agotado" },
  110514: { method: "", reason: "Sin nivel de acceso asignado" },
  110515: { method: "Tarjeta", reason: "Tarjeta no existe" },
  110516: { method: "", reason: "Fuera del horario permitido" },
  110517: { method: "Huella", reason: "Huella no registrada" },
  110518: { method: "Huella", reason: "Autenticación incorrecta" },
  110519: { method: "Huella + PIN", reason: "Autenticación incorrecta" },
  110520: { method: "Huella + PIN", reason: "Tiempo agotado" },
  110521: { method: "Rostro + huella", reason: "Autenticación incorrecta" },
  110522: { method: "Rostro + huella", reason: "Tiempo agotado" },
  110523: { method: "Rostro + PIN", reason: "Autenticación incorrecta" },
  110524: { method: "Rostro + PIN", reason: "Tiempo agotado" },
  110525: { method: "Rostro + tarjeta", reason: "Autenticación incorrecta" },
  110526: { method: "Rostro + tarjeta", reason: "Tiempo agotado" },
  110527: { method: "Rostro + PIN + huella", reason: "Autenticación incorrecta" },
  110528: { method: "Rostro + PIN + huella", reason: "Tiempo agotado" },
  110529: { method: "Rostro + tarjeta + huella", reason: "Autenticación incorrecta" },
  110530: { method: "Rostro + tarjeta + huella", reason: "Tiempo agotado" },
  110531: { method: "Rostro", reason: "Rostro no reconocido" },
  110533: { method: "Rostro", reason: "Falló la detección de rostro real" },
  110545: { method: "Autenticación combinada", reason: "Tiempo agotado" },
  110546: { method: "Tarjeta", reason: "Tarjeta M1 inválida" },
  110547: { method: "Tarjeta", reason: "Falló el cifrado de tarjeta CPU" },
  110548: { method: "Tarjeta", reason: "Lectura NFC deshabilitada" },
  110549: { method: "Tarjeta", reason: "Lectura de tarjeta EM no habilitada" },
  110550: { method: "Tarjeta", reason: "Lectura de tarjeta M1 no habilitada" },
  110551: { method: "Tarjeta", reason: "Lectura de tarjeta CPU deshabilitada" },
  110552: { method: "", reason: "Modo de autenticación no coincide" },
  110554: { method: "Tarjeta + contraseña", reason: "Máximo de intentos" },
  110555: { method: "Contraseña", reason: "Contraseña incorrecta" },
  110556: { method: "", reason: "Número de empleado no existe" },
  110557: { method: "", reason: "Dispositivo en modo reposo" },
  110559: { method: "Tarjeta", reason: "Falló el cifrado de tarjeta Desfire" },
  110560: { method: "", reason: "Ausencia" },
  110561: { method: "Rostro", reason: "Rasgos anómalos (mascarilla o temperatura)" },
  110565: { method: "Código QR", reason: "Código QR no válido" },
  110566: { method: "Código QR", reason: "Falló la verificación del código QR" },
  110567: { method: "Llavero", reason: "Llavero no autorizado" },
};

export function describeEvent(eventType: number | string | undefined): EventMeaning {
  const code = Number(eventType);
  if (!Number.isFinite(code) || code === 0) return { method: "" };
  const known = EVENTS[code];
  if (known) return known;
  // Codigo fuera de la tabla: mostrarlo tal cual es mas util que "Otro".
  return { method: `Evento ${code}` };
}
