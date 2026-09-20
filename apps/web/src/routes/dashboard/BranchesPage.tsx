import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { apiFetch, ApiError } from "../../lib/api-client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

interface Branch {
  publicId: string;
  name: string;
  address: string | null;
  isMain: boolean;
  isActive: boolean;
}

export function BranchesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: () => apiFetch<{ branches: Branch[] }>("/api/business/branches"),
  });

  const createBranch = useMutation({
    mutationFn: () => apiFetch("/api/business/branches", { method: "POST", body: { name, address: address || undefined } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setShowForm(false);
      setName("");
      setAddress("");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo crear la sucursal"),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    createBranch.mutate();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Sucursales</h1>
          <p className="text-sm text-ink-500">Administra las ubicaciones de tu negocio</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="gap-2">
          <Plus className="h-4 w-4" /> Nueva sucursal
        </Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input label="Nombre" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex-1">
              <Input label="Direccion" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <Button type="submit" loading={createBranch.isPending}>
              Guardar
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {branchesQuery.data?.branches.map((b) => (
          <Card key={b.publicId}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-ink-900">{b.name}</h3>
              {b.isMain && (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">Principal</span>
              )}
            </div>
            <p className="mt-1 text-sm text-ink-500">{b.address ?? "Sin direccion"}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
