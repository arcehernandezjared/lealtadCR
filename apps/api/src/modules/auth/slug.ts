import { prisma } from "@loyaltycr/database";

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Genera un slug unico para un negocio nuevo, agregando un sufijo numerico si hay colision. */
export async function generateUniqueBusinessSlug(name: string): Promise<string> {
  const base = slugify(name) || "negocio";
  let candidate = base;
  let attempt = 0;

  while (await prisma.business.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    attempt += 1;
    candidate = `${base}-${attempt + 1}`;
  }

  return candidate;
}
