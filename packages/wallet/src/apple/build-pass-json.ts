import { hexToRgbString, contrastingTextColor } from "./colors.js";

export interface LoyaltyPassData {
  serialNumber: string;
  authenticationToken: string;
  passTypeIdentifier: string;
  teamIdentifier: string;
  webServiceURL: string;
  businessName: string;
  programName: string;
  primaryColor: string;
  secondaryColor: string;
  customerFullName: string;
  qrValue: string;
  points: number;
  tierName: string | null;
  nextRewardLabel: string | null;
}

/**
 * Construye el pass.json de una tarjeta de lealtad tipo "storeCard" segun el
 * PassKit Package Format Reference de Apple. Funcion pura (sin I/O) para que
 * sea trivial de testear sin certificados reales — la firma/empaquetado
 * ocurre por separado en generate-pkpass.ts.
 */
export function buildLoyaltyPassJson(data: LoyaltyPassData) {
  const backgroundColor = hexToRgbString(data.primaryColor);
  const foregroundColor = contrastingTextColor(data.primaryColor);

  return {
    formatVersion: 1,
    passTypeIdentifier: data.passTypeIdentifier,
    teamIdentifier: data.teamIdentifier,
    serialNumber: data.serialNumber,
    authenticationToken: data.authenticationToken,
    webServiceURL: data.webServiceURL,
    organizationName: data.businessName,
    description: `${data.programName} — ${data.businessName}`,
    logoText: data.businessName,
    backgroundColor,
    foregroundColor,
    labelColor: foregroundColor,
    barcodes: [
      {
        message: data.qrValue,
        format: "PKBarcodeFormatQR",
        messageEncoding: "iso-8859-1",
      },
    ],
    storeCard: {
      headerFields: [{ key: "points", label: "PUNTOS", value: data.points }],
      primaryFields: [{ key: "customer", label: "CLIENTE", value: data.customerFullName }],
      secondaryFields: data.tierName ? [{ key: "tier", label: "NIVEL", value: data.tierName }] : [],
      auxiliaryFields: data.nextRewardLabel
        ? [{ key: "nextReward", label: "PROXIMA RECOMPENSA", value: data.nextRewardLabel }]
        : [],
      backFields: [
        {
          key: "program",
          label: "Programa",
          value: data.programName,
        },
        {
          key: "terms",
          label: "Terminos",
          value: "Esta tarjeta es personal e intransferible. Sujeta a los terminos del programa de lealtad.",
        },
      ],
    },
  };
}
