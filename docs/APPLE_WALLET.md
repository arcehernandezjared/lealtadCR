# Apple Wallet — credenciales e integración (Fase 4)

> **Estado: implementado, pendiente de tus credenciales reales.** El código
> que genera, firma y sirve los `.pkpass` está completo y probado
> (`packages/wallet/src/apple`, `apps/api/src/modules/wallet`), incluyendo un
> test que ejercita la firma PKCS#7 real de punta a punta con certificados
> de prueba desechables. Lo único que falta para que funcione con un iPhone
> real son **tus credenciales de Apple Developer** — sin ellas,
> `appleWalletConfigured` es `false` y la API responde con un error claro
> (`APPLE_WALLET_NOT_CONFIGURED`) en vez de simular un pass falso.

## Qué es técnicamente

Apple Wallet usa **PassKit**: un "pass" es un archivo `.pkpass` — un ZIP
firmado criptográficamente que contiene `pass.json` (los datos), imágenes
(icon, logo) y `manifest.json` con los hashes de cada archivo, todo firmado
con una **firma PKCS#7 desprendida** usando el certificado de tu Pass Type ID
+ el certificado intermedio de Apple (WWDR). No es HTML ni un PDF: es un
formato binario propio que solo Wallet sabe interpretar.

Para el caso de uso de LoyaltyCr (tarjeta de lealtad), el estilo de pass
usado es `storeCard`.

## Credenciales que necesitas obtener de Apple

1. **Apple Developer Program** (cuenta paga, ~US$99/año) —
   [developer.apple.com/programs](https://developer.apple.com/programs/).

2. **Pass Type ID** — en
   [developer.apple.com/account/resources/identifiers/list/passTypeId](https://developer.apple.com/account/resources/identifiers/list/passTypeId),
   crea un identificador con formato `pass.com.tuempresa.loyaltycr`.
   → variable de entorno `APPLE_PASS_TYPE_ID`.

3. **Team ID** — visible en
   [developer.apple.com/account](https://developer.apple.com/account) → *Membership*.
   → variable de entorno `APPLE_TEAM_ID`.

4. **Pass Type ID Certificate**: genera un CSR desde Keychain Access (macOS),
   súbelo al portal de Apple Developer para el Pass Type ID creado en el
   paso 2, descarga el certificado resultante, impórtalo en Keychain Access
   junto a su llave privada, y **expórtalo como `.p12`** con un password.

   El `.p12` trae el certificado y la llave privada empaquetados juntos, pero
   la librería que firma los `.pkpass` (`passkit-generator`) los necesita
   **por separado y en formato PEM**. Extráelos con OpenSSL:
   ```bash
   openssl pkcs12 -in Certificates.p12 -clcerts -nokeys -out signerCert.pem -legacy
   openssl pkcs12 -in Certificates.p12 -nocerts -out signerKey.pem -legacy
   ```
   (`-legacy` puede ser necesario en OpenSSL 3+ para leer el `.p12` que
   exporta Keychain Access). El primer comando te pide el password del
   `.p12`; el segundo además te pide definir un password nuevo para
   `signerKey.pem` — ese es el que va en `APPLE_CERTIFICATE_PASSWORD`.

   → codifica cada PEM en base64 (`base64 -i signerCert.pem | tr -d '\n'`)
   para `APPLE_SIGNER_CERT_BASE64` y `APPLE_SIGNER_KEY_BASE64` respectivamente.

5. **Certificado WWDR (Apple Worldwide Developer Relations)**: se descarga
   de [apple.com/certificateauthority](https://www.apple.com/certificateauthority/)
   (es un certificado intermedio público de Apple, no algo que tú generes).
   → codifícalo en base64 para `APPLE_WWDR_CERTIFICATE_BASE64`.

6. **Clave APNs (.p8)**, *solo necesaria para push de actualización de
   passes ya instalados* — se genera en
   [developer.apple.com/account/resources/authkeys/list](https://developer.apple.com/account/resources/authkeys/list).
   Anota el **Key ID** que te asigna Apple.
   → `APPLE_APNS_KEY_BASE64` (el `.p8` en base64) y `APPLE_APNS_KEY_ID`.

Todas estas variables ya están declaradas (vacías, documentadas) en
[`.env.example`](../.env.example). Mientras no estén todas configuradas,
`appleWalletConfigured` (`apps/api/src/config/env.ts`) es `false` y
`GET /api/portal/wallet/apple/:programId` responde `400` con
`error.details.code = "APPLE_WALLET_NOT_CONFIGURED"` — nunca un pass falso.

## Cómo está implementado

- **`packages/wallet/src/apple/build-pass-json.ts`** — construye el
  `pass.json` (storeCard) a partir de los datos del programa/cliente. Función
  pura, sin I/O, testeada directamente.
- **`packages/wallet/src/apple/solid-color-png.ts`** — Apple exige al menos
  `icon.png`; mientras un negocio no suba su propio logo, se genera un PNG
  real de color sólido (encoder PNG mínimo escrito a mano, sin dependencias)
  a partir del color de marca del programa.
- **`packages/wallet/src/apple/generate-pkpass.ts`** — arma el `.pkpass`
  (pass.json + iconos + manifest + firma PKCS#7) usando `passkit-generator`,
  que implementa el formato exacto que documenta Apple en vez de reinventar
  la firma a mano. Probado de punta a punta con un certificado autofirmado
  desechable (no es un certificado de Apple real, pero valida que el
  pipeline de firma/empaquetado corre sin errores).
- **`packages/wallet/src/apple/apns.ts`** — firma el JWT de proveedor de
  APNs (ES256) y envía el push "silencioso" de actualización via HTTP/2
  nativo de Node (`node:http2`), sin dependencias de terceros.
- **`apps/api/src/modules/wallet/wallet.service.ts`** — `issueApplePass()`
  verifica que el cliente/programa pertenezcan al negocio autenticado
  *antes* de revisar si Apple Wallet está configurado (para no filtrar el
  estado de configuración del servidor a alguien probando con IDs ajenos),
  genera el pass y lo persiste como `WalletPass`.
- **`apps/api/src/modules/wallet/apple-web-service.{ts,routes.ts}`** — el
  Wallet Web Service completo, montado en `/v1/...` (fuera de `/api`, porque
  esa ruta exacta es la que Apple exige en `webServiceURL`):
  - `POST /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}` — el dispositivo se registra para recibir actualizaciones.
  - `DELETE` (mismo path) — el dispositivo se da de baja.
  - `GET /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}?passesUpdatedSince=<tag>` — Apple pregunta qué passes cambiaron.
  - `GET /v1/passes/{passTypeIdentifier}/{serialNumber}` — devuelve el `.pkpass` actualizado.
  - `POST /v1/log` — logging de errores que reporta el dispositivo.

  Se autentican con el `authenticationToken` del propio pass (header
  `Authorization: ApplePass <token>`), **no** con el JWT de staff/cliente de
  la API — así lo define el protocolo de Apple. Probado con tests de
  integración reales (registro, baja, listado de actualizados) que no
  requieren certificados, porque son pura lógica de base de datos.
- **Actualización automática**: `apps/api/src/engine/loyalty-ledger.ts`
  llama a `notifyWalletsOfChange()` después de cada cambio de puntos (fuera
  de la transacción de DB y sin bloquear la respuesta al cliente). Si el
  cliente ya tiene un `WalletPass` de Apple, se envía el push APNs
  "silencioso" a cada dispositivo registrado — el dispositivo entonces
  vuelve a pedir el pass actualizado (`GET /v1/passes/...`). **Esto es
  push-to-pull, no un push con contenido** (sección 15 del brief): Wallet no
  recibe los puntos nuevos directamente por push, solo la señal de "algo
  cambió".

## Limitaciones a tener en cuenta

- Apple no permite subir passes de prueba a producción sin firmarlos con
  certificados reales; no hay "modo sandbox" equivalente al de otras APIs de
  Apple para PassKit.
- Los pushes de actualización solo llegan a dispositivos que se hayan
  registrado en el Web Service — eso solo ocurre cuando el usuario agrega el
  pass a un Wallet real (no se puede simular sin un iPhone).
- La cuenta de Apple Developer debe renovarse anualmente o los certificados
  dejan de validar passes ya instalados.
