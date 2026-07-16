"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";

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

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setValue(await fileToDataUrl(file));
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
          placeholder="Фото URL / ключ"
          className="h-9 min-w-0 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-slate-500"
        />
        {value ? (
          <button type="button" onClick={() => setValue("")} className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-red-500/10 text-red-100">
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/[0.04] text-slate-300">
            <ImagePlus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {value.startsWith("data:image") && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="Фото для поиска" className="mt-2 h-16 w-full rounded-xl object-cover" />
      )}
    </div>
  );
}
