# Google Wallet — credenciales e integración (Fase 4)

> **Estado: implementado, pendiente de tus credenciales reales.** El código
> que crea/actualiza clases y objetos, y genera el enlace "Agregar a Google
> Wallet", está completo y probado (`packages/wallet/src/google`,
> `apps/api/src/modules/wallet`) — incluye un test que firma y verifica un
> JWT real (RS256) con una llave de prueba. Solo falta tu cuenta de Google
> Wallet Console aprobada; sin ella, `googleWalletConfigured` es `false` y la
> API responde con un error claro (`GOOGLE_WALLET_NOT_CONFIGURED`) en vez de
> simular un enlace falso. La aprobación de la cuenta de issuer puede
> tardar, así que conviene tramitarla con anticipación.

## Qué es técnicamente

Google Wallet API trabaja con dos conceptos:

- **`LoyaltyClass`**: la "plantilla" del programa de lealtad de tu negocio
  (nombre, logo, colores, estructura de campos). Se crea una vez por
  `LoyaltyProgram`.
- **`LoyaltyObject`**: la instancia por cliente (sus puntos, su nivel, su
  código de barras). Se crea una por `Customer` + `LoyaltyProgram`.

A diferencia de Apple, no hay un archivo binario que firmar a mano: todo se
hace vía **REST API** (`walletobjects.googleapis.com`) autenticada con una
Service Account de Google Cloud, y el "agregar a Wallet" se resuelve con un
**JWT firmado** (no con un archivo que el usuario descarga).

## Credenciales que necesitas obtener de Google

1. **Cuenta de Google Wallet Console**: inscríbete como issuer en
   [pay.google.com/business/console](https://pay.google.com/business/console/)
   (requiere una cuenta de Google y, según el tipo de pass, revisión/aprobación
   de Google — puede tardar).

2. **Issuer ID**: una vez aprobada la cuenta, Google te asigna un Issuer ID
   visible en la consola.
   → variable de entorno `GOOGLE_WALLET_ISSUER_ID`.

3. **Service Account de Google Cloud** con el rol de **Wallet Object
   Issuer**: créala en
   [console.cloud.google.com/iam-admin/serviceaccounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
   del mismo proyecto de Google Cloud vinculado a tu cuenta de Wallet
   Console, y vincúlala desde la propia consola de Wallet (Google requiere
   asociar explícitamente la service account como usuario autorizado del
   issuer). Descarga la clave en formato JSON.
   → codifica el JSON completo en base64
   (`base64 -i service-account.json | tr -d '\n'`) para
   `GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_BASE64`.

Ambas variables ya están declaradas (vacías, documentadas) en
[`.env.example`](../.env.example). Mientras no estén configuradas,
`googleWalletConfigured` (`apps/api/src/config/env.ts`) es `false` y
`GET /api/portal/wallet/google/:programId` responde `400` con
`error.details.code = "GOOGLE_WALLET_NOT_CONFIGURED"`.

## Cómo está implementado

- **`packages/wallet/src/google/build-loyalty-class.ts` /
  `build-loyalty-object.ts`** — funciones puras que arman los payloads de
  `LoyaltyClass`/`LoyaltyObject` (nombre del negocio, logo, colores, puntos,
  nivel, próxima recompensa, código QR). `reviewStatus: "UNDER_REVIEW"` es el
  valor correcto para una clase nueva — Google debe aprobarla antes de que
  sea visible en producción para clientes reales.
- **`packages/wallet/src/google/google-wallet-client.ts`** — cliente
  autenticado contra `walletobjects.googleapis.com` usando
  `google-auth-library` (paquete oficial de Google) con el scope
  `wallet_object.issuer`. Los métodos `upsertLoyaltyClass`/`upsertLoyaltyObject`
  intentan `POST` (crear) y, si ya existe (409), hacen `PATCH` (actualizar) —
  la API de Google no tiene un verbo único de "crear o actualizar".
- **`packages/wallet/src/google/save-link.ts`** — genera el JWT (RS256,
  firmado con la llave privada de la service account) que arma el enlace
  `https://pay.google.com/gp/v/save/<JWT>`. Referencia la `LoyaltyObject`
  **por id**, no la reenvía completa, porque se asume que ya fue
  creada/actualizada vía la REST API antes de generar el link — así el
  objeto existe en Google desde el primer momento y se puede seguir
  actualizando aunque el cliente todavía no le haya dado "Guardar". Probado
  con una llave RSA generada en el momento del test (verifica que la firma
  es real y que se rechaza con la llave pública equivocada).
- **`apps/api/src/modules/wallet/wallet.service.ts`** — `issueGooglePass()`
  verifica pertenencia al negocio *antes* de revisar si Google Wallet está
  configurado (mismo motivo que en Apple: no filtrar el estado de
  configuración del servidor), crea/actualiza la clase y el objeto, y
  devuelve el `saveUrl` listo para `GET /api/portal/wallet/google/:programId`.
- **Actualizaciones**: a diferencia de Apple, **no hace falta un servidor de
  push propio** — `notifyWalletsOfChange()` (llamado desde
  `apps/api/src/engine/loyalty-ledger.ts` tras cada cambio de puntos) hace
  `PATCH` directo a la `LoyaltyObject` vía la REST API, y Google Wallet
  notifica al dispositivo del usuario por su cuenta. Esta es una diferencia
  arquitectónica real frente a Apple Wallet (que sí requiere el Wallet Web
  Service + APNs, ver `docs/APPLE_WALLET.md`) y simplifica bastante el lado
  del servidor para esta plataforma.

## Limitaciones a tener en cuenta

- El proceso de aprobación como issuer puede tardar (Google revisa el caso
  de uso); hay que solicitarlo con anticipación a la fecha en que se quiera
  lanzar la Fase 4.
- El JWT de "Agregar a Wallet" debe firmarse en el servidor (nunca exponer
  la llave privada de la service account al frontend).
