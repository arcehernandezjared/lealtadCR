import { Link } from "react-router-dom";
import { ArrowRight, Smartphone, Gift, Zap, BarChart3, QrCode, Wallet } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

const FEATURES = [
  {
    icon: Wallet,
    title: "Apple Wallet & Google Wallet",
    description: "Tarjetas de lealtad reales en el wallet del celular de tus clientes, sin apps que instalar.",
  },
  {
    icon: QrCode,
    title: "Un QR por cliente",
    description: "Identifica clientes, registra visitas y valida recompensas en segundos desde el mostrador.",
  },
  {
    icon: Gift,
    title: "Recompensas y niveles",
    description: "Define reglas de puntos, niveles VIP y recompensas canjeables con codigos unicos.",
  },
  {
    icon: Zap,
    title: "Automatizaciones",
    description: "Cumpleanos, clientes inactivos o nuevo nivel: dispara acciones automaticas sin esfuerzo.",
  },
  {
    icon: BarChart3,
    title: "Analytics en tiempo real",
    description: "Retencion, visitas, puntos otorgados y recompensas canjeadas en un dashboard claro.",
  },
  {
    icon: Smartphone,
    title: "Portal del cliente",
    description: "Tus clientes consultan su progreso y beneficios desde cualquier telefono.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="text-lg font-semibold tracking-tight text-ink-900">
          Loyalty<span className="text-brand-600">Cr</span>
        </div>
        <nav className="hidden items-center gap-8 text-sm font-medium text-ink-600 md:flex">
          <a href="#como-funciona" className="hover:text-ink-900">Como funciona</a>
          <a href="#caracteristicas" className="hover:text-ink-900">Caracteristicas</a>
          <a href="#precios" className="hover:text-ink-900">Precios</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">Iniciar sesion</Button>
          </Link>
          <Link to="/register">
            <Button size="sm">Crear cuenta</Button>
          </Link>
        </div>
      </header>

      <section className="relative mx-auto max-w-5xl px-6 pb-24 pt-16 text-center">
        <div className="pointer-events-none absolute inset-x-0 -top-20 -z-10 flex justify-center overflow-hidden blur-3xl">
          <div className="h-72 w-[42rem] rounded-full bg-gradient-to-tr from-brand-200 via-brand-100 to-transparent opacity-70" />
        </div>

        <span className="inline-flex items-center rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-xs font-medium text-ink-600 animate-fade-in">
          Hecho para negocios de Costa Rica y LATAM
        </span>

        <h1 className="mx-auto mt-6 max-w-3xl text-balance text-5xl font-semibold tracking-tight text-ink-900 sm:text-6xl animate-fade-in">
          Convierte clientes ocasionales en{" "}
          <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
            clientes frecuentes
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-500 animate-fade-in">
          Tarjetas de lealtad digitales para Apple Wallet y Google Wallet, recompensas y
          automatizaciones en un solo lugar.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row animate-fade-in">
          <Link to="/register">
            <Button size="lg" className="gap-2">
              Crear programa de lealtad <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a href="#como-funciona">
            <Button size="lg" variant="outline">Ver como funciona</Button>
          </a>
        </div>
      </section>

      <section id="caracteristicas" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink-900">
            Todo lo que necesitas para fidelizar
          </h2>
          <p className="mt-3 text-ink-500">
            Una plataforma completa, desde la tarjeta digital hasta el analisis de retencion.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-ink-900">{f.title}</h3>
              <p className="mt-1.5 text-sm text-ink-500">{f.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="border-y border-ink-100 bg-ink-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-ink-900">
            Como funciona
          </h2>
          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {[
              { step: "1", title: "Crea tu programa", desc: "Define reglas de puntos, niveles y recompensas en minutos." },
              { step: "2", title: "Comparte el QR", desc: "Tus clientes agregan su tarjeta a Apple o Google Wallet al instante." },
              { step: "3", title: "Registra visitas", desc: "Tu equipo escanea, suma puntos y canjea recompensas desde el mostrador." },
            ].map((s) => (
              <div key={s.step} className="text-center sm:text-left">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-ink-900 text-sm font-semibold text-white sm:mx-0">
                  {s.step}
                </div>
                <h3 className="mt-4 font-semibold text-ink-900">{s.title}</h3>
                <p className="mt-1.5 text-sm text-ink-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="precios" className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-ink-900">Precios simples</h2>
        <p className="mt-3 text-ink-500">Empieza gratis 14 dias, sin tarjeta de credito.</p>
        <div className="mt-6">
          <Link to="/register">
            <Button size="lg" className="gap-2">
              Empezar ahora <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-ink-100 py-10 text-center text-sm text-ink-400">
        © {new Date().getFullYear()} LoyaltyCr. Todos los derechos reservados.
      </footer>
    </div>
  );
}
