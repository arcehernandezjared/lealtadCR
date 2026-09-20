import bcrypt from "bcryptjs";

/**
 * bcrypt (via bcryptjs, sin dependencias nativas) en vez de Argon2: en este
 * entorno de desarrollo (Windows sin toolchain de compilacion garantizado)
 * `argon2` requiere bindings nativos que pueden fallar al instalar. bcrypt
 * con 12 rounds es un estandar de la industria perfectamente valido para
 * password hashing (ver seccion 18 del brief, que acepta "bcrypt/Argon2").
 */
const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
