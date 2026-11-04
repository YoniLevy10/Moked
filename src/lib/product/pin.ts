import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from "crypto";

function key(): Buffer {
  const secret = process.env.NUMBER_PIN_KEY || process.env.AUTH_SECRET || "moked-dev-secret";
  return createHash("sha256").update(secret).digest();
}

export function randomPin(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function encryptPin(pin: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(pin, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptPin(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
