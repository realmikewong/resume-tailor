"use client";

const templates = [
  {
    id: "modern",
    name: "Modern",
    description: "Clean lines, subtle color accents, sans-serif fonts",
    preview: "bg-gradient-to-br from-blue-50 to-white",
  },
  {
    id: "classic",
    name: "Classic",
    description: "Traditional layout, serif headings, timeless style",
    preview: "bg-gradient-to-br from-gray-50 to-white",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Maximum whitespace, typography-focused, no frills",
    preview: "bg-white",
  },
] as const;

export function TemplatePicker({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {templates.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`p-4 rounded-lg border-2 text-left transition ${
            selected === t.id
              ? "border-blue-600 ring-2 ring-blue-200"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div
            className={`h-32 rounded mb-3 ${t.preview} border border-gray-100`}
          />
          <h3 className="font-medium">{t.name}</h3>
          <p className="text-xs text-gray-500">{t.description}</p>
        </button>
      ))}
    </div>
  );
}
