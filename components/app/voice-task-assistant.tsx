"use client";

import { useMemo, useRef, useState } from "react";
import { Mic, MicOff, Send, Wand2 } from "lucide-react";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const departments = [
  ["accounting", ["бухгалтер", "бухгалтерия", "счет", "оплата", "касса"]],
  ["operations", ["опера", "операционный", "оператор", "заказ", "маршрут", "доставка"]],
  ["household", ["хоз", "хозяй", "склад", "убор", "ремонт", "инвентарь"]],
  ["base", ["база", "общ", "основа"]],
] as const;

function setFormValue(form: HTMLFormElement, name: string, value: string) {
  const field = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
  if (!field) return;
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

function dateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function parseVoiceTask(text: string) {
  const normalized = text.toLowerCase();
  const title = normalized
    .replace(/^(создай|добавь|запиши|поставь)\s+(задачу|таск)\s*/i, "")
    .replace(/\s+(срочно|важно|высокий приоритет|низкий приоритет|средний приоритет).*$/i, "")
    .trim();

  const department =
    departments.find(([, words]) => words.some((word) => normalized.includes(word)))?.[0] ?? "base";

  const priority = normalized.includes("срочно")
    ? "urgent"
    : normalized.includes("высок")
      ? "high"
      : normalized.includes("низк")
        ? "low"
        : "medium";

  const status = normalized.includes("в работу") || normalized.includes("начать") ? "in_progress" : "new";
  const dueDate = normalized.includes("послезавтра")
    ? dateOffset(2)
    : normalized.includes("завтра")
      ? dateOffset(1)
      : normalized.includes("сегодня")
        ? dateOffset(0)
        : "";

  const assigneeMatch = normalized.match(/(?:ответственный|исполнитель|для)\s+([а-яa-zёәіңғүұқөһ\s]{2,24})(?:\s|$)/i);

  return {
    title: title || text,
    department,
    priority,
    status,
    dueDate,
    assignee: assigneeMatch?.[1]?.trim() ?? "",
    notes: text,
  };
}

export function VoiceTaskAssistant() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [mode, setMode] = useState<"fill" | "save">("fill");
  const submitAfterVoice = useRef(false);
  const recognition = useMemo(() => {
    if (typeof window === "undefined") return null;
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ??
      (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    const instance = new SpeechRecognition();
    instance.lang = "ru-RU";
    instance.interimResults = false;
    instance.continuous = false;
    return instance;
  }, []);

  function applyText(text: string) {
    const form = document.querySelector<HTMLFormElement>("[data-voice-task-form='true']");
    if (!form) return null;
    const task = parseVoiceTask(text);
    setFormValue(form, "title", task.title);
    setFormValue(form, "department", task.department);
    setFormValue(form, "priority", task.priority);
    setFormValue(form, "status", task.status);
    if (task.dueDate) setFormValue(form, "dueDate", task.dueDate);
    if (task.assignee) setFormValue(form, "assignee", task.assignee);
    setFormValue(form, "notes", `Голосовое задание: ${task.notes}`);
    return form;
  }

  function startListening(shouldSave = false) {
    if (!recognition) return;
    submitAfterVoice.current = shouldSave;
    setMode(shouldSave ? "save" : "fill");
    setListening(true);
    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      setTranscript(text);
      if (text) {
        const form = applyText(text);
        if (form && submitAfterVoice.current) {
          window.setTimeout(() => form.requestSubmit(), 250);
        }
      }
    };
    recognition.onend = () => {
      setListening(false);
      submitAfterVoice.current = false;
    };
    recognition.onerror = () => {
      setListening(false);
      submitAfterVoice.current = false;
    };
    recognition.start();
  }

  return (
    <div className="mt-4 rounded-3xl border border-cyan-300/20 bg-slate-950/35 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-black text-white">Голосовое управление задачами</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
            Скажите: “Добавь задачу купить муку, бухгалтерия, срочно, дедлайн завтра”.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={listening ? () => recognition?.stop() : () => startListening(false)}
            disabled={!recognition}
            className="premium-button h-11 bg-cyan-300 px-4 text-sm text-cyan-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {listening && mode === "fill" ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {listening && mode === "fill" ? "Остановить" : "Заполнить голосом"}
          </button>
          <button
            type="button"
            onClick={listening ? () => recognition?.stop() : () => startListening(true)}
            disabled={!recognition}
            className="premium-button h-11 bg-white px-4 text-sm text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {listening && mode === "save" ? <MicOff className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {listening && mode === "save" ? "Остановить" : "Сказать и сохранить"}
          </button>
        </div>
      </div>
      {transcript ? (
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200">
          <Wand2 className="mt-0.5 h-4 w-4 text-cyan-100" />
          <span>{transcript}</span>
        </div>
      ) : null}
      {!recognition ? <p className="mt-3 text-xs font-semibold text-amber-100">Ваш браузер не поддерживает голосовой ввод. На Chrome обычно работает.</p> : null}
    </div>
  );
}
