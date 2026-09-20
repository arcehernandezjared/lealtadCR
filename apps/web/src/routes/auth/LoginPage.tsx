import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, ApiError } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { AuthShell } from "./AuthShell";

interface BusinessOption {
  businessId: string;
  businessPublicId: string;
  name: string;
  role: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [businessOptions, setBusinessOptions] = useState<BusinessOption[] | null>(null);
  const [preAuthToken, setPreAuthToken] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await apiFetch<{
        accessToken?: string;
        requiresBusinessSelection?: boolean;
        preAuthToken?: string;
        businesses?: BusinessOption[];
      }>("/api/auth/login", { method: "POST", body: { email, password }, skipAuthRetry: true });

      if (result.requiresBusinessSelection) {
        setBusinessOptions(result.businesses ?? []);
        setPreAuthToken(result.preAuthToken ?? null);
        return;
      }

      if (result.accessToken) {
        setAccessToken(result.accessToken);
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesion");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectBusiness(businessId: string) {
    if (!preAuthToken) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<{ accessToken: string }>("/api/auth/select-business", {
        method: "POST",
        body: { businessId },
        headers: { Authorization: `Bearer ${preAuthToken}` },
        skipAuthRetry: true,
      });
      setAccessToken(result.accessToken);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo continuar");
    } finally {
      setLoading(false);
    }
  }

  if (businessOptions) {
    return (
      <AuthShell title="Elige tu negocio" subtitle="Tu cuenta tiene acceso a varios negocios.">
        <div className="flex flex-col gap-3">
          {businessOptions.map((b) => (
            <Card
              key={b.businessId}
              className="cursor-pointer text-left hover:border-brand-300"
              onClick={() => handleSelectBusiness(b.businessId)}
            >
              <p className="font-medium text-ink-900">{b.name}</p>
              <p className="text-sm text-ink-500">Rol: {b.role}</p>
            </Card>
          ))}
        </div>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Inicia sesion" subtitle="Administra tu programa de lealtad.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Correo electronico"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@negocio.com"
        />
        <Input
          label="Contrasena"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="font-medium text-brand-600 hover:text-brand-700">
            Olvidaste tu contrasena?
          </Link>
        </div>
        <Button type="submit" loading={loading} className="w-full">
          Iniciar sesion
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500">
        No tienes cuenta?{" "}
        <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700">
          Crea tu programa de lealtad
        </Link>
      </p>
    </AuthShell>
  );
}
