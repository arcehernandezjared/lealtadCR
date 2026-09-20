export interface LoyaltyClassData {
  issuerId: string;
  classSuffix: string;
  businessName: string;
  programName: string;
  primaryColorHex: string;
  logoUrl: string | null;
}

/**
 * Construye el recurso `LoyaltyClass` (la "plantilla" del programa, una por
 * LoyaltyProgram) segun la Google Wallet API. `reviewStatus: "UNDER_REVIEW"`
 * es el valor correcto para una clase nueva: Google debe aprobarla antes de
 * que sea visible en produccion para clientes reales (ver docs/GOOGLE_WALLET.md).
 */
export function buildLoyaltyClass(data: LoyaltyClassData) {
  return {
    id: `${data.issuerId}.${data.classSuffix}`,
    issuerName: data.businessName,
    programName: data.programName,
    programLogo: data.logoUrl
      ? {
          sourceUri: { uri: data.logoUrl },
          contentDescription: { defaultValue: { language: "es", value: `Logo de ${data.businessName}` } },
        }
      : undefined,
    hexBackgroundColor: data.primaryColorHex,
    reviewStatus: "UNDER_REVIEW",
  };
}
