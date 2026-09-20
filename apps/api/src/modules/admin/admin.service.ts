import { prisma } from "@loyaltycr/database";
import { AppError } from "@loyaltycr/shared";

export async function listBusinesses(page: number, pageSize: number) {
  const [items, total] = await Promise.all([
    prisma.business.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        subscription: { include: { plan: true } },
        _count: { select: { customers: true, employees: true } },
      },
    }),
    prisma.business.count(),
  ]);
  return { items, total, page, pageSize };
}

export async function setBusinessStatus(businessId: string, status: "ACTIVE" | "SUSPENDED" | "CANCELLED") {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw AppError.notFound("Negocio no encontrado");
  return prisma.business.update({ where: { id: businessId }, data: { status } });
}

export async function getPlatformStats() {
  const [totalBusinesses, activeBusinesses, totalCustomers, totalEmployees] = await Promise.all([
    prisma.business.count(),
    prisma.business.count({ where: { status: "ACTIVE" } }),
    prisma.customer.count(),
    prisma.employee.count(),
  ]);
  return { totalBusinesses, activeBusinesses, totalCustomers, totalEmployees };
}
