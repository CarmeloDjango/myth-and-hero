import "server-only";

import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, keylen: number) => Promise<Buffer>;

/** 부모 PIN: 숫자 4~6자리 */
export const PIN_PATTERN = /^\d{4,6}$/;

/** "scrypt$<salt hex>$<hash hex>" */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(pin, salt, 32);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [algo, saltHex, hashHex] = stored.split("$");
  if (algo !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(pin, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * 부모 모드 표시: "<familyId>.<만료 시각 ms>.<서명>"
 * 서명은 NEON_AUTH_COOKIE_SECRET으로 만든 HMAC입니다. 쿠키를 고쳐서 부모 모드에 들어갈 수 없습니다.
 */
export const PARENT_MODE_TTL_MS = 10 * 60 * 1000;

function sign(value: string): string {
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!secret) throw new Error("NEON_AUTH_COOKIE_SECRET이 없습니다.");
  return createHmac("sha256", secret).update(`parent-mode:${value}`).digest("base64url");
}

export function createParentToken(familyId: string, now = Date.now()): string {
  const body = `${familyId}.${now + PARENT_MODE_TTL_MS}`;
  return `${body}.${sign(body)}`;
}

export function isValidParentToken(token: string | undefined, familyId: string, now = Date.now()): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [fid, exp, sig] = parts;
  if (fid !== familyId || !(Number(exp) > now)) return false;
  const expected = Buffer.from(sign(`${fid}.${exp}`));
  const actual = Buffer.from(sig);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
