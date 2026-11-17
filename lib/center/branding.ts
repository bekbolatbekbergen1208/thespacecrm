import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { dataDir } from "./db";

export type CenterLogo = { mime: string; data: Buffer };
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export function parseLogo(dataUrl: string): CenterLogo {
  const match =
    /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error("PNG, JPG немесе WebP суретін таңдаңыз");
  const data = Buffer.from(match[2], "base64");
  if (!data.length || data.length > MAX_LOGO_BYTES)
    throw new Error("Логотип 2 МБ-тан аспауы керек");
  const mime = match[1];
  const valid =
    mime === "image/png"
      ? data
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : mime === "image/jpeg"
        ? data[0] === 255 && data[1] === 216 && data[2] === 255
        : data.toString("ascii", 0, 4) === "RIFF" &&
          data.toString("ascii", 8, 12) === "WEBP";
  if (!valid) throw new Error("Сурет мазмұны файл пішіміне сәйкес емес");
  return { mime, data };
}

export async function saveLogo(dataUrl: string) {
  parseLogo(dataUrl);
  await mkdir(dataDir, { recursive: true, mode: 0o700 });
  const temporary = path.join(dataDir, `logo-${randomUUID()}.tmp`);
  await writeFile(temporary, dataUrl, { mode: 0o600 });
  await rename(temporary, path.join(dataDir, "brand-logo.txt"));
}

export async function readLogo(): Promise<CenterLogo | null> {
  try {
    return parseLogo(
      await readFile(path.join(dataDir, "brand-logo.txt"), "utf8"),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  for (const [extension, mime] of [
    ["png", "image/png"],
    ["jpg", "image/jpeg"],
    ["webp", "image/webp"],
  ]) {
    try {
      const data = await readFile(
        path.join(process.cwd(), "public/brand", `logo.${extension}`),
      );
      return parseLogo(`data:${mime};base64,${data.toString("base64")}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return null;
}
export async function logoDataUrl() {
  const logo = await readLogo();
  return logo
    ? `data:${logo.mime};base64,${logo.data.toString("base64")}`
    : null;
}
