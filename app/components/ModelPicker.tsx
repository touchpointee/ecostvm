"use client";

import Image from "next/image";

const MODELS = [
  { value: "Facelift", label: "Facelift", src: "/facelift.png" },
  { value: "Pre-Facelift", label: "Pre-Facelift", src: "/pre-facelift.png" },
];

export default function ModelPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {MODELS.map((m) => {
        const selected = value === m.value;
        return (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            className={`group relative flex flex-col overflow-hidden rounded-2xl border-2 transition-all focus:outline-none focus:ring-4 focus:ring-yellow-400 ${
              selected
                ? "border-yellow-400 shadow-lg ring-2 ring-yellow-400"
                : "border-black/20 hover:border-black"
            }`}
          >
            <div className="relative h-40 w-full overflow-hidden bg-gray-100 sm:h-48">
              <Image
                src={m.src}
                alt={m.label}
                fill
                quality={100}
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 40vw, 500px"
                unoptimized
              />
            </div>
            <div
              className={`flex items-center gap-2.5 px-4 py-3 transition-colors ${
                selected ? "bg-yellow-400" : "bg-white group-hover:bg-gray-50"
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  selected ? "border-black bg-black" : "border-black/40 bg-white"
                }`}
              >
                {selected && (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </span>
              <span className={`text-sm font-semibold ${selected ? "text-black" : "text-black/80"}`}>
                {m.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
