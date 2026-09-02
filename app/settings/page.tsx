import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getHctHost,
  getHctKeys,
  isDryRun,
  hasHctKeys,
  effectiveMode,
  getRequestedMode,
} from "@/lib/settings";
import { readDeviceCodes } from "@/lib/deviceCodes";
import { readEncryptionMap } from "@/lib/encryptionStore";
import { config } from "@/lib/config";
import { DryRunToggle } from "@/components/DryRunToggle";
import { ModeToggle } from "@/components/ModeToggle";
import { DeviceCodeList } from "@/components/DeviceCodeList";
import { ForgetKeysButton } from "@/components/ForgetKeysButton";
import { EditableValue } from "@/components/EditableValue";
import { KeysSetup } from "@/components/KeysSetup";

function mask(secret: string): string {
  if (!secret) return "(vacío)";
  if (secret.length <= 6) return "••••••";
  return `${secret.slice(0, 4)}••••${secret.slice(-2)}`;
}

function Row({ label, value, children }: { label: string; value?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <tr>
      <td style={{ width: 220 }}>{label}</td>
      <td className="mono">{value}</td>
      <td className="meta">{children}</td>
    </tr>
  );
}

async function SettingsContent() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "operator") {
    const configured = await hasHctKeys();
    return (
      <>
        <h1 className="page-title">Configuración</h1>
        <div id="claves">
          {configured ? (
            <div className="card">
              <p className="meta" style={{ marginBottom: 12 }}>
                Este navegador ya tiene claves del OpenAPI. Olvídalas para volver a los datos simulados
                o captura otras.
              </p>
              <ForgetKeysButton />
            </div>
          ) : (
            <KeysSetup />
          )}
        </div>
      </>
    );
  }

  const [dryRun, codes, encMap, mode, requestedMode] = await Promise.all([
    isDryRun(),
    readDeviceCodes(),
    readEncryptionMap(),
    effectiveMode(),
    getRequestedMode(),
  ]);
  const encValues = Object.values(encMap);
  const encCount = encValues.filter((v) => v.encrypted).length;

  let hctKeys: { appKey: string; secretKey: string; source: "cookie" | "settings" | "env" } | null = null;
  try {
    hctKeys = await getHctKeys();
  } catch {
    // sin claves: se capturan con clic sobre "(sin configurar)"
  }
  const hctHost = await getHctHost();

  return (
    <>
      <h1 className="page-title">Configuración</h1>
      <p className="page-sub">
        Preferencias de <em>este navegador</em> (cookie cifrada). Otro dispositivo o borrar las
        cookies del sitio vuelve a pedirlas. Los secretos nunca se muestran completos.
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 8 }}>Comandos de puerta</h3>
        <p className="meta" style={{ marginBottom: 12 }}>
          Decide si los comandos (abrir, bloquear, etc.) se envían de verdad a Hik-Connect o solo
          se simulan. <strong>Simulados</strong>: no tocan el tenant — ideal para demos sin riesgo.{" "}
          <strong>Reales</strong>: la puerta abre de verdad. Se guarda en la cookie de este
          navegador (por defecto: simulados).
        </p>
        <div className="row">
          <span className={`badge ${dryRun ? "ok" : "warn"}`}>
            {dryRun ? "Actual: SIMULADOS" : "Actual: REALES"}
          </span>
          <DryRunToggle enabled={dryRun} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 8 }}>Modo de operación</h3>
        <p className="meta" style={{ marginBottom: 12 }}>
          De dónde salen los datos (cámaras, puertas, personas, marcaciones). <strong>Live</strong>:
          tenant real vía OpenAPI. <strong>Mock</strong>: datos de ejemplo, sin tocar Hik-Connect.
          Se guarda en este navegador (por defecto: mock hasta que elijas live y tengas claves).
        </p>
        <div className="row">
          <span className={`badge ${mode === "live" ? "ok" : "warn"}`}>
            {mode === "live" ? "Actual: LIVE" : "Actual: MOCK"}
          </span>
          <ModeToggle requested={requestedMode} />
        </div>
        {requestedMode === "live" && mode === "mock" && (
          <div className="alert info" style={{ marginTop: 12 }}>
            Pediste <strong>live</strong>, pero este navegador no tiene AppKey y SecretKey, así que
            el demo sigue mostrando datos de ejemplo. Captúralas abajo para conectar al tenant.
          </div>
        )}
      </div>

      <div className="card" id="claves" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 8 }}>Credenciales del OpenAPI (Hik-Connect for Teams)</h3>
        <p className="meta" style={{ marginBottom: 12 }}>
          Con ellas se obtiene el accessToken (válido 7 días).{" "}
          <strong>Clic en cualquier valor para editarlo</strong> (Enter guarda, Esc cancela). Puedes
          guardar AppKey y SecretKey por separado. Viven en la cookie de este navegador (180 días);
          el servidor solo las usa en memoria para hablar con el OpenAPI.
        </p>
        <table className="table">
          <tbody>
            <Row label="HCT_HOST" value={<EditableValue field="host" display={hctHost} />}>
              Servidor centralizado del OpenAPI.
            </Row>
            <Row
              label="HCT_APP_KEY"
              value={
                <EditableValue
                  field="appKey"
                  secret
                  display={hctKeys ? mask(hctKeys.appKey) : "(sin configurar)"}
                />
              }
            >
              Identificador de la aplicación.
            </Row>
            <Row
              label="HCT_SECRET_KEY"
              value={
                <EditableValue
                  field="secretKey"
                  secret
                  display={hctKeys ? mask(hctKeys.secretKey) : "(sin configurar)"}
                />
              }
            >
              Secreto de la aplicación. No se muestra completo.
            </Row>
          </tbody>
        </table>
        {hctKeys && (
          <div style={{ marginTop: 12 }}>
            <ForgetKeysButton />
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 8 }}>Usuarios del demo</h3>
        <p className="meta" style={{ marginBottom: 12 }}>
          Dos usuarios fijos del <strong>hosting</strong> (variables de Vercel), no de la cookie.
          El OpenAPI de Teams es a nivel plataforma (AppKey/SecretKey): si un cliente necesita
          permisos por usuario, los implementa en su propio BFF.
        </p>
        <table className="table">
          <tbody>
            <Row label="admin" value="admin">
              Rol operator: todo + comandos + esta pantalla. Contraseña: POC_ADMIN_PASSWORD del hosting.
            </Row>
            <Row label="visor" value="visor">
              Rol viewer: solo lectura. Contraseña: POC_VIEWER_PASSWORD del hosting.
            </Row>
            <Row label="SESSION_SECRET" value={mask(config.sessionSecret)}>
              Firma las cookies de sesión. Solo se cambia en el hosting; no es por navegador.
            </Row>
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 8 }}>Códigos de verificación de cámaras</h3>
        <p className="meta" style={{ marginBottom: 12 }}>
          Los streams cifrados piden el código del dispositivo. Al capturarlo se guarda en la cookie
          de este navegador y no se vuelve a pedir. Solo se guarda si el video reproduce de verdad.
        </p>
        <DeviceCodeList codes={codes} />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 8 }}>Dónde se guarda cada cosa</h3>
        <table className="table">
          <tbody>
            <Row label="Cookie poc_hct" value="cifrada · este navegador · 180 días">
              Host, AppKey, SecretKey, modo live/mock, comandos simulados/reales y códigos de cámara.
              No se escribe en Vercel ni en git.
            </Row>
            <Row label="Caché de cifrado" value={`${encValues.length} dispositivos · ${encCount} cifrados`}>
              Mapa por serial (botón “Sincronizar cifrado”). En Vercel es temporal y puede vaciarse
              entre ejecuciones; no va en la cookie (sería demasiado grande).
            </Row>
            <Row label="Auditoría" value="no persistente en Vercel">
              Intenta escribir un log local; en serverless se descarta si el disco no deja. No afecta
              a guardar claves ni toggles.
            </Row>
            <Row label="CAMERA_ALLOWLIST" value={config.cameraAllowlist.length > 0 ? `${config.cameraAllowlist.length} cámaras` : "(vacía = todas)"}>
              Filtro opcional del hosting, no de este navegador.
            </Row>
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="spinner" />}>
      <SettingsContent />
    </Suspense>
  );
}
