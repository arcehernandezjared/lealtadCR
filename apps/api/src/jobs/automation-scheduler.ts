import { runScheduledAutomations } from "../modules/automations/automations-engine.js";
import { logger } from "../lib/logger.js";

const RUN_INTERVAL_MS = 60 * 60 * 1000; // cada hora

/**
 * Scheduler en el mismo proceso para las automatizaciones "programadas"
 * (cliente inactivo, cumpleanos). `runScheduledAutomations()` es idempotente
 * dentro de la misma ventana de ~20h (ver automations-engine.ts), asi que
 * correrlo cada hora es seguro aunque se traslape con el intervalo anterior.
 *
 * Limitacion conocida y aceptada para esta fase: esto es un `setInterval`
 * en un unico proceso Node. Sirve para un despliegue de una sola instancia
 * (lo tipico en Railway/Render para este tipo de producto). Si LoyaltyCr
 * llegara a correr en varias instancias a la vez, esto se duplicaria (cada
 * instancia correria el scheduler) y habria que moverlo a un job runner
 * dedicado (ej. un cron de la plataforma de hosting que le pegue a un
 * endpoint interno, o una cola tipo BullMQ) — no se resuelve aqui porque
 * agregar esa infraestructura sin necesitarla todavia seria sobre-ingenieria.
 */
export function startAutomationScheduler(): NodeJS.Timeout {
  const tick = () => {
    runScheduledAutomations()
      .then(({ evaluated, executed }) => {
        if (executed > 0) logger.info({ evaluated, executed }, "Automatizaciones programadas ejecutadas");
      })
      .catch((err) => logger.error({ err }, "runScheduledAutomations fallo"));
  };

  tick(); // primera corrida inmediata al arrancar, no esperar 1 hora
  return setInterval(tick, RUN_INTERVAL_MS);
}
