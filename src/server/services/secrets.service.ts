import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const VERSION = "v1";

export type SecretsService = {
  encrypt(value: string): string;
  decrypt(value: string): string;
  mask(value: string | null | undefined): string;
};

export function createSecretsService(input: {
  encryptionKey: string;
}): SecretsService {
  if (input.encryptionKey.length < 16) {
    throw new Error("Secrets encryption key must be at least 16 characters.");
  }

  const key = createHash("sha256").update(input.encryptionKey).digest();

  return {
    encrypt(value) {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      const ciphertext = Buffer.concat([
        cipher.update(value, "utf8"),
        cipher.final(),
      ]);
      const tag = cipher.getAuthTag();

      return [VERSION, iv, tag, ciphertext]
        .map((part) =>
          typeof part === "string" ? part : part.toString("base64url"),
        )
        .join(":");
    },
    decrypt(value) {
      const [version, iv, tag, ciphertext] = value.split(":");

      if (version !== VERSION || !iv || !tag || !ciphertext) {
        throw new Error("Invalid encrypted secret format.");
      }

      const decipher = createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(iv, "base64url"),
      );
      decipher.setAuthTag(Buffer.from(tag, "base64url"));

      return Buffer.concat([
        decipher.update(Buffer.from(ciphertext, "base64url")),
        decipher.final(),
      ]).toString("utf8");
    },
    mask(value) {
      if (!value) {
        return "";
      }

      if (value.length <= 8) {
        return "****";
      }

      return `${value.slice(0, 4)}...${value.slice(-4)}`;
    },
  };
}
