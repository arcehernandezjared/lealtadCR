# Google Wallet — guía de credenciales e integración (Fase 4)

> **Estado**: no implementado todavía (planeado para la Fase 4). Este
> documento existe para que puedas tramitar el acceso con Google mientras se
> completan las fases anteriores — la aprobación de la cuenta de issuer no es
> instantánea.

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
`googleWalletConfigured` (`apps/api/src/config/env.ts`) será `false`.

## Plan de implementación (Fase 4)

1. **Crear la `LoyaltyClass`** al activar Google Wallet para un
   `LoyaltyProgram`: nombre del negocio, logo, colores, estructura de
   campos (puntos, nivel, próxima recompensa), tipo de código de barras
   (`QR_CODE` con el valor de `Customer.qrCode`).
2. **Crear/actualizar la `LoyaltyObject`** por cliente: se guarda su id en
   `WalletPass.googleObjectId` (`platform = GOOGLE`).
3. **Generar el enlace "Agregar a Google Wallet"**: se construye un JWT
   (firmado con la llave privada de la service account, algoritmo RS256)
   que referencia la `LoyaltyObject`, y el enlace final es
   `https://pay.google.com/gp/v/save/<JWT>`. Ese es el link que se comparte
   por QR o se pone en un botón "Agregar a Google Wallet".
4. **Actualizaciones**: a diferencia de Apple, **no hace falta implementar
   un servidor de push propio**: basta con hacer `PATCH` a la
   `LoyaltyObject` vía la API REST cuando cambian los puntos/nivel del
   cliente, y Google Wallet se encarga de notificar al dispositivo del
   usuario automáticamente. Esta es una diferencia arquitectónica real
   frente a Apple Wallet (que si requiere el Wallet Web Service + APNs
   descrito en `docs/APPLE_WALLET.md`) y simplifica bastante el lado del
   servidor para esta plataforma.

## Limitaciones a tener en cuenta

- El proceso de aprobación como issuer puede tardar (Google revisa el caso
  de uso); hay que solicitarlo con anticipación a la fecha en que se quiera
  lanzar la Fase 4.
- El JWT de "Agregar a Wallet" debe firmarse en el servidor (nunca exponer
  la llave privada de la service account al frontend).
