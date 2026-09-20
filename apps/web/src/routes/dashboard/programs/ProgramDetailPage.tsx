import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { apiFetch } from "../../../lib/api-client";
import type { LoyaltyProgram } from "./types";
import { RulesSection } from "./RulesSection";
import { TiersSection } from "./TiersSection";
import { RewardsSection } from "./RewardsSection";

export function ProgramDetailPage() {
  const { programId } = useParams<{ programId: string }>();

  const programQuery = useQuery({
    queryKey: ["program", programId],
    queryFn: () => apiFetch<LoyaltyProgram>(`/api/programs/${programId}`),
    enabled: Boolean(programId),
  });

  const program = programQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <Link to="/dashboard/programs" className="flex w-fit items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" /> Volver a programas
      </Link>

      {program && (
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 rounded-full" style={{ backgroundColor: program.primaryColor }} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{program.name}</h1>
            {program.description && <p className="text-sm text-ink-500">{program.description}</p>}
          </div>
        </div>
      )}

      {program && (
        <div className="grid gap-6 lg:grid-cols-2">
          <RulesSection programId={program.id} rules={program.rules} />
          <TiersSection programId={program.id} tiers={program.tiers} />
          <div className="lg:col-span-2">
            <RewardsSection programId={program.id} rewards={program.rewards} />
          </div>
        </div>
      )}
    </div>
  );
}
