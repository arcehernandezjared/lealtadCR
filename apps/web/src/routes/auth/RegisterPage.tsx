import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, ApiError } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { AuthShell } from "./AuthShell";

export function RegisterPage() {
  const navigate = useNavigate();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    businessName: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await apiFetch<{ accessToken: string }>("/api/auth/register", {
        method: "POST",
        body: form,
        skipAuthRetry: true,
      });
      setAccessToken(result.accessToken);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la cuenta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Crea tu programa de lealtad" subtitle="14 dias gratis, sin tarjeta de credito.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nombre" required value={form.firstName} onChange={(e) => update("firstName", e.target.value)} />
          <Input label="Apellido" required value={form.lastName} onChange={(e) => update("lastName", e.target.value)} />
        </div>
        <Input label="Nombre del negocio" required value={form.businessName} onChange={(e) => update("businessName", e.target.value)} placeholder="Barberia XYZ" />
        <Input label="Correo electronico" type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} />
        <Input
          label="Contrasena"
          type="password"
          required
          minLength={10}
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
        />
        <p className="-mt-2 text-xs text-ink-400">Minimo 10 caracteres, con mayuscula, minuscula y numero.</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          Crear cuenta
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500">
        Ya tienes cuenta?{" "}
        <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Inicia sesion
        </Link>
      </p>
    </AuthShell>
  );
}
