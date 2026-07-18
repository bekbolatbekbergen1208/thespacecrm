"use client";

import { useRef, useState } from "react";
import { Bot, Camera, ImagePlus, X } from "lucide-react";

async function fileToDataUrl(file: File) {
  const image = await decodeImage(file);
  const maxSize = 520;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

async function imageToAiKeywords(file: File) {
  const image = await decodeImage(file);
  const canvas = document.createElement("canvas");
  const size = 80;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "";

  ctx.drawImage(image, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;
  const colors: Record<string, number> = {
    black: 0,
    white: 0,
    gray: 0,
    red: 0,
    orange: 0,
    yellow: 0,
    green: 0,
    blue: 0,
    purple: 0,
    pink: 0,
    brown: 0,
  };
  let bright = 0;
  let dark = 0;

  for (let index = 0; index < data.length; index += 16) {
    const r = data[index] ?? 0;
    const g = data[index + 1] ?? 0;
    const b = data[index + 2] ?? 0;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lightness = (max + min) / 2;
    const saturation = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
    const hue = rgbToHue(r, g, b);

    if (lightness > 205) bright += 1;
    if (lightness < 70) dark += 1;

    if (saturation < 0.12) {
      if (lightness > 205) colors.white += 1;
      else if (lightness < 70) colors.black += 1;
      else colors.gray += 1;
      continue;
    }

    if (hue < 15 || hue >= 345) colors.red += 1;
    else if (hue < 38) colors.orange += 1;
    else if (hue < 65) colors.yellow += 1;
    else if (hue < 165) colors.green += 1;
    else if (hue < 255) colors.blue += 1;
    else if (hue < 290) colors.purple += 1;
    else if (hue < 330) colors.pink += 1;
    else colors.brown += 1;
  }

  const labels: Record<string, string> = {
    black: "черный қара black темный",
    white: "белый ақ white светлый",
    gray: "серый сұр gray",
    red: "красный қызыл red",
    orange: "оранжевый orange",
    yellow: "желтый сары yellow gold",
    green: "зеленый жасыл green",
    blue: "синий көк blue",
    purple: "фиолетовый күлгін purple",
    pink: "розовый қызғылт pink",
    brown: "коричневый қоңыр brown",
  };
  const topColors = Object.entries(colors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .filter(([, count]) => count > 0)
    .map(([color]) => labels[color])
    .join(" ");
  const tone = bright > dark * 1.4 ? "светлый ақ light" : dark > bright * 1.4 ? "темный қара dark" : "средний neutral";

  return `ai-photo ${tone} ${topColors}`.trim();
}

function rgbToHue(r: number, g: number, b: number) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  if (!delta) return 0;
  if (max === red) return (60 * (((green - blue) / delta) % 6) + 360) % 360;
  if (max === green) return 60 * ((blue - red) / delta + 2);
  return 60 * ((red - green) / delta + 4);
}

async function decodeImage(file: File) {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      // Some mobile browsers expose createImageBitmap but fail for camera captures.
    }
  }

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image"));
    };
    image.src = objectUrl;
  });
}

export function PhotoSearchField({
  name = "photo",
  defaultValue = "",
}: {
  name?: string;
  defaultValue?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [preview, setPreview] = useState(defaultValue.startsWith("data:image") ? defaultValue : "");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setIsAnalyzing(true);
    try {
      const [dataUrl, aiKeywords] = await Promise.all([fileToDataUrl(file), imageToAiKeywords(file)]);
      setPreview(dataUrl);
      setValue(aiKeywords);
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-2">
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 transition hover:bg-cyan-300/15"
          title="Сфотографировать с телефона"
        >
          <Camera className="h-4 w-4" />
        </button>
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={isAnalyzing ? "AI анализирует фото..." : "Фото URL / ключ / AI цвет"}
          className="h-9 min-w-0 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-slate-500"
        />
        {value ? (
          <button type="button" onClick={() => { setValue(""); setPreview(""); }} className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-red-500/10 text-red-100">
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/[0.04] text-slate-300">
            <ImagePlus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {preview && (
        <div className="mt-2 grid gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Фото для поиска" className="h-16 w-full rounded-xl object-cover" />
          <p className="flex items-center gap-2 text-[11px] font-semibold text-cyan-100/80">
            <Bot className="h-3.5 w-3.5" />
            AI создал ключи: {value || "анализ..."}
          </p>
        </div>
      )}
    </div>
  );
}
