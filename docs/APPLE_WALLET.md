# Apple Wallet — guía de credenciales e integración (Fase 4)

> **Estado**: no implementado todavía (planeado para la Fase 4, según
> `docs/ARCHITECTURE.md`). Este documento existe ahora para que puedas ir
> tramitando las credenciales con Apple, que tardan en aprobarse, mientras
> se completan las fases anteriores. El código de esta fase **no simulará**
> una integración real: hasta que exista la implementación, no se afirmará
> en ningún lugar del producto que "ya funciona con Apple Wallet".

## Qué es técnicamente

Apple Wallet usa **PassKit**: un "pass" es un archivo `.pkpass` — un ZIP
firmado criptográficamente que contiene `pass.json` (los datos), imágenes
(icon, logo, strip) y `manifest.json` con los hashes de cada archivo, todo
firmado con una **firma PKCS#7 desprendida** usando el certificado de tu
Pass Type ID + el certificado intermedio de Apple (WWDR). No es HTML ni un
PDF: es un formato binario propio que solo Wallet sabe interpretar.

Para el caso de uso de LoyaltyCr (tarjeta de lealtad), el estilo de pass
correcto es `storeCard`.

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
   → codifica el `.p12` en base64 (`base64 -i Certificates.p12 | tr -d '\n'`)
   para `APPLE_CERTIFICATE_BASE64`, y el password que le pusiste va en
   `APPLE_CERTIFICATE_PASSWORD`.

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
[`.env.example`](../.env.example). Mientras no estén configuradas,
`appleWalletConfigured` (`apps/api/src/config/env.ts`) será `false` y el
backend debe operar en modo mock de desarrollo (nunca afirmando al usuario
final que el pass es real).

## Plan de implementación (Fase 4)

1. **Generación del `.pkpass`**: construir `pass.json` (storeCard) con los
   campos del programa de lealtad (puntos, nivel, próxima recompensa),
   incluir el código de barras/QR del cliente (`Customer.qrCode`), empaquetar
   con las imágenes del negocio, generar `manifest.json` y firmarlo con
   PKCS#7 usando el certificado del Pass Type ID + WWDR (librería candidata:
   `passkit-generator`, que implementa el formato correctamente en vez de
   reinventar la firma PKCS#7 a mano).
2. **Persistencia**: cada pass generado crea/actualiza un `WalletPass`
   (`platform = APPLE`) con su `serialNumber` único y `authToken` (usado por
   el Wallet Web Service para autenticar al dispositivo).
3. **Wallet Web Service** (requerido por Apple si quieres que los passes se
   actualicen solos, no solo al momento de agregarlos): implementar los
   endpoints que el propio dispositivo llama:
   - `POST /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}`
     — el dispositivo se registra para recibir actualizaciones → crea un
     `WalletDeviceRegistration`.
   - `DELETE` (mismo path) — el dispositivo se da de baja (usuario quitó el pass).
   - `GET /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}?passesUpdatedSince=<tag>`
     — Apple pregunta qué passes cambiaron.
   - `GET /v1/passes/{passTypeIdentifier}/{serialNumber}` — devuelve el
     `.pkpass` actualizado.
   - `POST /v1/log` — logging de errores que reporta el dispositivo.
4. **Notificación de cambio**: cuando cambian los puntos/nivel de un cliente,
   el servidor **no envía el contenido nuevo por push**. Envía una
   notificación APNs vacía (topic = tu Pass Type ID) a cada
   `WalletDeviceRegistration.pushToken` del pass — es solo una señal de
   "algo cambió"; el dispositivo entonces llama al paso 3 (`GET /v1/passes/...`)
   para bajar el pass actualizado. **Esta es la diferencia clave frente a un
   push notification tradicional** (sección 15 del brief): la actualización
   de Wallet es "push-to-pull", no push-con-contenido.

## Limitaciones a tener en cuenta

- Apple no permite subir passes de prueba a producción sin firmarlos con
  certificados reales; no hay "modo sandbox" equivalente al de otras APIs de
  Apple para PassKit — por eso el modo mock de desarrollo debe simular la
  estructura del `.pkpass` localmente sin intentar registrar dispositivos
  reales ni enviar APNs.
- La cuenta de Apple Developer debe renovarse anualmente o los certificados
  dejan de validar passes ya instalados.
