import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

type EncryptedPayload = {
  v: 1;
  iv: string;
  tag: string;
  data: string;
};

function getEncryptionKey(): Buffer {
  const secret = process.env.OPENAI_KEY_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("Missing OPENAI_KEY_ENCRYPTION_SECRET");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptOpenAiKey(key: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(key, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const payload: EncryptedPayload = {
    v: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: ciphertext.toString("base64"),
  };

  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

export function decryptOpenAiKey(payload: string): string {
  const decoded = Buffer.from(payload, "base64").toString("utf8");
  const parsed = JSON.parse(decoded) as EncryptedPayload;

  if (parsed.v !== 1 || !parsed.iv || !parsed.tag || !parsed.data) {
    throw new Error("Invalid encrypted payload");
  }

  const iv = Buffer.from(parsed.iv, "base64");
  const tag = Buffer.from(parsed.tag, "base64");
  const data = Buffer.from(parsed.data, "base64");

  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  return plaintext.toString("utf8");
}
