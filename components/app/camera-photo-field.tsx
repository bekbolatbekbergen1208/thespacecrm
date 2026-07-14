"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";

async function decodeImage(file: File) {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall back to HTMLImageElement below for browsers that expose but fail createImageBitmap.
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

export function CameraPhotoField({
  name = "photoUrl",
  label = "Фото",
  defaultValue = "",
}: {
  name?: string;
  label?: string;
  defaultValue?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(defaultValue);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const image = await decodeImage(file);
    const maxSize = 900;
    const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
    setPreview(dataUrl);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-3">
      <input type="hidden" name={name} value={preview} />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
        {preview && (
          <button type="button" onClick={() => setPreview("")} className="rounded-full bg-red-500/10 p-1.5 text-red-100">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Фото" className="mt-3 h-32 w-full rounded-2xl object-cover" />
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 flex h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-cyan-300/25 bg-cyan-300/10 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15"
        >
          <Camera className="h-6 w-6" />
          Сфотографировать
        </button>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="premium-button mt-3 h-9 w-full border border-white/10 bg-white/[0.04] px-3 text-xs text-slate-100"
      >
        <ImagePlus className="h-3.5 w-3.5" />
        Выбрать / заменить фото
      </button>
    </div>
  );
}
