export interface LoyaltyObjectData {
  issuerId: string;
  classSuffix: string;
  objectSuffix: string;
  customerFullName: string;
  qrValue: string;
  points: number;
  tierName: string | null;
  nextRewardLabel: string | null;
}

/**
 * Construye el recurso `LoyaltyObject` (la tarjeta de UN cliente especifico,
 * referenciando su LoyaltyClass) segun la Google Wallet API.
 */
export function buildLoyaltyObject(data: LoyaltyObjectData) {
  const textModulesData = [];
  if (data.tierName) {
    textModulesData.push({ id: "tier", header: "NIVEL", body: data.tierName });
  }
  if (data.nextRewardLabel) {
    textModulesData.push({ id: "next_reward", header: "PROXIMA RECOMPENSA", body: data.nextRewardLabel });
  }

  return {
    id: `${data.issuerId}.${data.objectSuffix}`,
    classId: `${data.issuerId}.${data.classSuffix}`,
    state: "ACTIVE",
    accountName: data.customerFullName,
    loyaltyPoints: {
      label: "Puntos",
      balance: { string: String(data.points) },
    },
    textModulesData,
    barcode: {
      type: "QR_CODE",
      value: data.qrValue,
    },
  };
}
