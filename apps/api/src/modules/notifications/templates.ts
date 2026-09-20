/** Plantillas de los tipos de notificacion automatica listados en la seccion 15 del brief. */

export function rewardUnlockedTemplate(rewardName: string, code: string) {
  return {
    type: "reward_unlocked",
    title: "🎁 Recompensa desbloqueada",
    body: `Desbloqueaste "${rewardName}". Muestra el codigo ${code} en tu proxima visita para canjearla.`,
  };
}

export function pointsAddedTemplate(points: number, newBalance: number) {
  return {
    type: "points_added",
    title: "⭐ Puntos agregados",
    body: `Sumaste ${points} puntos. Tu nuevo balance es de ${newBalance} puntos.`,
  };
}

export function tierChangedTemplate(tierName: string) {
  return {
    type: "tier_changed",
    title: "🔥 Subiste de nivel",
    body: `Ahora eres nivel ${tierName}. Sigue acumulando puntos para desbloquear mas beneficios.`,
  };
}

export function birthdayTemplate(businessName: string) {
  return {
    type: "birthday",
    title: "🎉 Feliz cumpleanos",
    body: `${businessName} te desea un feliz cumpleanos. Revisa tu tarjeta, te dejamos un regalo.`,
  };
}

export function inactivityReminderTemplate(businessName: string, days: number) {
  return {
    type: "inactivity_reminder",
    title: "Te estamos esperando",
    body: `Han pasado ${days} dias desde tu ultima visita a ${businessName}. Vuelve pronto.`,
  };
}
