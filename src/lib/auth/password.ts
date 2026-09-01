import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

/**
 * Hash de contraseña con salt aleatorio por usuario (scrypt, nativo de
 * Node, sin dependencia externa). Formato guardado: "salt:hashHex".
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(plain, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Compara en tiempo constante (timingSafeEqual) para no filtrar por
 * cuánto tarda la comparación si la contraseña es parcialmente correcta.
 */
export async function verifyPassword(plain: string, storedHash: string): Promise<boolean> {
  const [salt, keyHex] = storedHash.split(":");
  if (!salt || !keyHex) return false;

  const storedKey = Buffer.from(keyHex, "hex");
  const derivedKey = (await scrypt(plain, salt, KEY_LENGTH)) as Buffer;

  if (derivedKey.length !== storedKey.length) return false;
  return timingSafeEqual(derivedKey, storedKey);
}
