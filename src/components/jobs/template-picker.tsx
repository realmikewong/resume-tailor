"use client";

function ModernPreview() {
  return (
    <svg viewBox="0 0 160 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="200" fill="#f8fafc" />
      {/* Name */}
      <rect x="40" y="14" width="80" height="8" rx="2" fill="#2563EB" />
      {/* Contact */}
      <rect x="30" y="26" width="100" height="4" rx="1" fill="#93c5fd" />
      {/* Divider */}
      <line x1="16" y1="36" x2="144" y2="36" stroke="#3B82F6" strokeWidth="1" />
      {/* Summary heading */}
      <rect x="16" y="42" width="40" height="5" rx="1" fill="#2563EB" />
      {/* Summary text */}
      <rect x="16" y="50" width="128" height="3" rx="1" fill="#cbd5e1" />
      <rect x="16" y="55" width="120" height="3" rx="1" fill="#cbd5e1" />
      {/* Experience heading */}
      <rect x="16" y="66" width="50" height="5" rx="1" fill="#2563EB" />
      {/* Job 1 */}
      <rect x="16" y="74" width="90" height="4" rx="1" fill="#334155" />
      <rect x="110" y="74" width="34" height="4" rx="1" fill="#93c5fd" />
      <rect x="20" y="81" width="120" height="3" rx="1" fill="#cbd5e1" />
      <rect x="20" y="86" width="115" height="3" rx="1" fill="#cbd5e1" />
      <rect x="20" y="91" width="118" height="3" rx="1" fill="#cbd5e1" />
      {/* Job 2 */}
      <rect x="16" y="100" width="85" height="4" rx="1" fill="#334155" />
      <rect x="110" y="100" width="34" height="4" rx="1" fill="#93c5fd" />
      <rect x="20" y="107" width="122" height="3" rx="1" fill="#cbd5e1" />
      <rect x="20" y="112" width="110" height="3" rx="1" fill="#cbd5e1" />
      {/* Skills heading */}
      <rect x="16" y="124" width="30" height="5" rx="1" fill="#2563EB" />
      {/* Skill pills */}
      <rect x="16" y="132" width="28" height="6" rx="3" fill="#dbeafe" />
      <rect x="48" y="132" width="35" height="6" rx="3" fill="#dbeafe" />
      <rect x="87" y="132" width="30" height="6" rx="3" fill="#dbeafe" />
      <rect x="16" y="141" width="32" height="6" rx="3" fill="#dbeafe" />
      <rect x="52" y="141" width="26" height="6" rx="3" fill="#dbeafe" />
      {/* Education heading */}
      <rect x="16" y="156" width="45" height="5" rx="1" fill="#2563EB" />
      <rect x="16" y="164" width="100" height="3" rx="1" fill="#cbd5e1" />
      <rect x="16" y="169" width="80" height="3" rx="1" fill="#cbd5e1" />
    </svg>
  );
}

function ClassicPreview() {
  return (
    <svg viewBox="0 0 160 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="200" fill="#fafaf9" />
      {/* Name */}
      <rect x="40" y="14" width="80" height="8" rx="1" fill="#1F2937" />
      {/* Contact */}
      <rect x="35" y="26" width="90" height="4" rx="1" fill="#9ca3af" />
      {/* Double line divider */}
      <line x1="16" y1="35" x2="144" y2="35" stroke="#1F2937" strokeWidth="0.5" />
      <line x1="16" y1="37" x2="144" y2="37" stroke="#1F2937" strokeWidth="0.5" />
      {/* Summary heading */}
      <rect x="50" y="43" width="60" height="5" rx="1" fill="#1F2937" />
      {/* Summary text */}
      <rect x="16" y="52" width="128" height="3" rx="1" fill="#d1d5db" />
      <rect x="16" y="57" width="124" height="3" rx="1" fill="#d1d5db" />
      {/* Experience heading */}
      <rect x="40" y="68" width="80" height="5" rx="1" fill="#1F2937" />
      {/* Job 1 */}
      <rect x="16" y="77" width="95" height="4" rx="1" fill="#374151" />
      <rect x="16" y="83" width="60" height="3" rx="1" fill="#9ca3af" />
      <rect x="20" y="89" width="120" height="3" rx="1" fill="#d1d5db" />
      <rect x="20" y="94" width="116" height="3" rx="1" fill="#d1d5db" />
      <rect x="20" y="99" width="118" height="3" rx="1" fill="#d1d5db" />
      {/* Job 2 */}
      <rect x="16" y="108" width="88" height="4" rx="1" fill="#374151" />
      <rect x="16" y="114" width="55" height="3" rx="1" fill="#9ca3af" />
      <rect x="20" y="120" width="122" height="3" rx="1" fill="#d1d5db" />
      <rect x="20" y="125" width="112" height="3" rx="1" fill="#d1d5db" />
      {/* Skills heading */}
      <rect x="55" y="136" width="50" height="5" rx="1" fill="#1F2937" />
      <rect x="16" y="145" width="128" height="3" rx="1" fill="#d1d5db" />
      {/* Education heading */}
      <rect x="45" y="156" width="70" height="5" rx="1" fill="#1F2937" />
      <rect x="16" y="165" width="105" height="3" rx="1" fill="#d1d5db" />
      <rect x="16" y="170" width="85" height="3" rx="1" fill="#d1d5db" />
    </svg>
  );
}

function MinimalPreview() {
  return (
    <svg viewBox="0 0 160 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="200" fill="#ffffff" />
      {/* Name */}
      <rect x="16" y="16" width="70" height="7" rx="1" fill="#111827" />
      {/* Contact */}
      <rect x="16" y="27" width="100" height="3" rx="1" fill="#9ca3af" />
      {/* Summary - no heading, just text */}
      <rect x="16" y="40" width="128" height="3" rx="1" fill="#d1d5db" />
      <rect x="16" y="45" width="120" height="3" rx="1" fill="#d1d5db" />
      {/* Thin divider */}
      <line x1="16" y1="54" x2="144" y2="54" stroke="#e5e7eb" strokeWidth="0.5" />
      {/* Experience heading */}
      <rect x="16" y="60" width="50" height="4" rx="1" fill="#111827" />
      {/* Job 1 */}
      <rect x="16" y="68" width="80" height="3.5" rx="1" fill="#374151" />
      <rect x="100" y="68" width="44" height="3.5" rx="1" fill="#9ca3af" />
      <rect x="16" y="74" width="124" height="2.5" rx="1" fill="#e5e7eb" />
      <rect x="16" y="78" width="118" height="2.5" rx="1" fill="#e5e7eb" />
      <rect x="16" y="82" width="120" height="2.5" rx="1" fill="#e5e7eb" />
      {/* Job 2 */}
      <rect x="16" y="91" width="75" height="3.5" rx="1" fill="#374151" />
      <rect x="100" y="91" width="44" height="3.5" rx="1" fill="#9ca3af" />
      <rect x="16" y="97" width="120" height="2.5" rx="1" fill="#e5e7eb" />
      <rect x="16" y="101" width="115" height="2.5" rx="1" fill="#e5e7eb" />
      {/* Thin divider */}
      <line x1="16" y1="110" x2="144" y2="110" stroke="#e5e7eb" strokeWidth="0.5" />
      {/* Skills heading */}
      <rect x="16" y="116" width="30" height="4" rx="1" fill="#111827" />
      <rect x="16" y="123" width="128" height="2.5" rx="1" fill="#e5e7eb" />
      {/* Thin divider */}
      <line x1="16" y1="132" x2="144" y2="132" stroke="#e5e7eb" strokeWidth="0.5" />
      {/* Education heading */}
      <rect x="16" y="138" width="45" height="4" rx="1" fill="#111827" />
      <rect x="16" y="145" width="100" height="2.5" rx="1" fill="#e5e7eb" />
      <rect x="16" y="149" width="80" height="2.5" rx="1" fill="#e5e7eb" />
    </svg>
  );
}

function EditorialPreview() {
  return (
    <svg viewBox="0 0 160 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="200" fill="#ffffff" />
      {/* Name — large bold left-aligned */}
      <rect x="16" y="14" width="90" height="9" rx="1" fill="#000000" />
      {/* Contact — right aligned */}
      <rect x="60" y="27" width="84" height="3" rx="1" fill="#555555" />
      <rect x="72" y="32" width="72" height="3" rx="1" fill="#555555" />
      {/* Section heading — centered with underline */}
      <rect x="45" y="44" width="70" height="5" rx="1" fill="#000000" />
      <line x1="45" y1="51" x2="115" y2="51" stroke="#000000" strokeWidth="0.75" />
      {/* Job 1 */}
      <rect x="16" y="57" width="90" height="3.5" rx="1" fill="#222222" />
      <rect x="110" y="57" width="34" height="3.5" rx="1" fill="#555555" />
      <rect x="20" y="63" width="120" height="2.5" rx="1" fill="#cccccc" />
      <rect x="20" y="67" width="114" height="2.5" rx="1" fill="#cccccc" />
      <rect x="20" y="71" width="118" height="2.5" rx="1" fill="#cccccc" />
      {/* Section heading 2 */}
      <rect x="35" y="83" width="90" height="5" rx="1" fill="#000000" />
      <line x1="35" y1="90" x2="125" y2="90" stroke="#000000" strokeWidth="0.75" />
      {/* Job 2 */}
      <rect x="16" y="96" width="85" height="3.5" rx="1" fill="#222222" />
      <rect x="110" y="96" width="34" height="3.5" rx="1" fill="#555555" />
      <rect x="20" y="102" width="120" height="2.5" rx="1" fill="#cccccc" />
      <rect x="20" y="106" width="108" height="2.5" rx="1" fill="#cccccc" />
      {/* Section heading 3 — Skills */}
      <rect x="50" y="118" width="60" height="5" rx="1" fill="#000000" />
      <line x1="50" y1="125" x2="110" y2="125" stroke="#000000" strokeWidth="0.75" />
      <rect x="16" y="130" width="128" height="2.5" rx="1" fill="#cccccc" />
      <rect x="16" y="135" width="100" height="2.5" rx="1" fill="#cccccc" />
      {/* Section heading 4 — Education */}
      <rect x="42" y="147" width="76" height="5" rx="1" fill="#000000" />
      <line x1="42" y1="154" x2="118" y2="154" stroke="#000000" strokeWidth="0.75" />
      <rect x="16" y="159" width="110" height="2.5" rx="1" fill="#cccccc" />
      <rect x="16" y="164" width="85" height="2.5" rx="1" fill="#cccccc" />
    </svg>
  );
}

function BoldPreview() {
  return (
    <svg viewBox="0 0 160 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="200" fill="#ffffff" />
      {/* Name */}
      <rect x="16" y="14" width="85" height="9" rx="1" fill="#C2410C" />
      {/* Contact */}
      <rect x="16" y="27" width="110" height="3" rx="1" fill="#e8a87c" />
      {/* Experience heading — terracotta, left-aligned bold */}
      <rect x="16" y="40" width="55" height="5" rx="1" fill="#C2410C" />
      {/* Job 1 */}
      <rect x="16" y="49" width="88" height="3.5" rx="1" fill="#333333" />
      <rect x="110" y="49" width="34" height="3.5" rx="1" fill="#e8a87c" />
      <rect x="20" y="55" width="120" height="2.5" rx="1" fill="#d1d5db" />
      <rect x="20" y="59" width="115" height="2.5" rx="1" fill="#d1d5db" />
      <rect x="20" y="63" width="118" height="2.5" rx="1" fill="#d1d5db" />
      {/* Job 2 */}
      <rect x="16" y="72" width="82" height="3.5" rx="1" fill="#333333" />
      <rect x="110" y="72" width="34" height="3.5" rx="1" fill="#e8a87c" />
      <rect x="20" y="78" width="122" height="2.5" rx="1" fill="#d1d5db" />
      <rect x="20" y="82" width="110" height="2.5" rx="1" fill="#d1d5db" />
      {/* Skills heading */}
      <rect x="16" y="94" width="32" height="5" rx="1" fill="#C2410C" />
      <rect x="16" y="103" width="128" height="2.5" rx="1" fill="#d1d5db" />
      <rect x="16" y="108" width="100" height="2.5" rx="1" fill="#d1d5db" />
      {/* Education heading */}
      <rect x="16" y="120" width="50" height="5" rx="1" fill="#C2410C" />
      <rect x="16" y="129" width="110" height="2.5" rx="1" fill="#d1d5db" />
      <rect x="16" y="134" width="90" height="2.5" rx="1" fill="#d1d5db" />
    </svg>
  );
}

function SharpPreview() {
  return (
    <svg viewBox="0 0 160 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="200" fill="#ffffff" />
      {/* Name */}
      <rect x="16" y="14" width="80" height="8" rx="1" fill="#0F172A" />
      {/* Strong rule beneath name */}
      <line x1="16" y1="26" x2="144" y2="26" stroke="#0F172A" strokeWidth="1.5" />
      {/* Contact */}
      <rect x="16" y="30" width="128" height="3" rx="1" fill="#64748B" />
      {/* Experience heading with thin rule */}
      <rect x="16" y="42" width="52" height="4" rx="1" fill="#0F172A" />
      <line x1="16" y1="48" x2="144" y2="48" stroke="#94a3b8" strokeWidth="0.5" />
      {/* Job 1 */}
      <rect x="16" y="52" width="90" height="3.5" rx="1" fill="#1e293b" />
      <rect x="110" y="52" width="34" height="3.5" rx="1" fill="#64748B" />
      <rect x="20" y="58" width="120" height="2.5" rx="1" fill="#cbd5e1" />
      <rect x="20" y="62" width="114" height="2.5" rx="1" fill="#cbd5e1" />
      <rect x="20" y="66" width="118" height="2.5" rx="1" fill="#cbd5e1" />
      {/* Job 2 */}
      <rect x="16" y="74" width="84" height="3.5" rx="1" fill="#1e293b" />
      <rect x="110" y="74" width="34" height="3.5" rx="1" fill="#64748B" />
      <rect x="20" y="80" width="120" height="2.5" rx="1" fill="#cbd5e1" />
      <rect x="20" y="84" width="108" height="2.5" rx="1" fill="#cbd5e1" />
      {/* Skills heading with thin rule */}
      <rect x="16" y="95" width="32" height="4" rx="1" fill="#0F172A" />
      <line x1="16" y1="101" x2="144" y2="101" stroke="#94a3b8" strokeWidth="0.5" />
      <rect x="16" y="105" width="128" height="2.5" rx="1" fill="#cbd5e1" />
      <rect x="16" y="110" width="100" height="2.5" rx="1" fill="#cbd5e1" />
      {/* Education heading with thin rule */}
      <rect x="16" y="121" width="48" height="4" rx="1" fill="#0F172A" />
      <line x1="16" y1="127" x2="144" y2="127" stroke="#94a3b8" strokeWidth="0.5" />
      <rect x="16" y="131" width="115" height="2.5" rx="1" fill="#cbd5e1" />
      <rect x="16" y="136" width="90" height="2.5" rx="1" fill="#cbd5e1" />
    </svg>
  );
}

const templates = [
  {
    id: "modern",
    name: "Modern",
    description: "Clean lines, subtle color accents, sans-serif fonts",
    Preview: ModernPreview,
  },
  {
    id: "classic",
    name: "Classic",
    description: "Traditional layout, serif headings, timeless style",
    Preview: ClassicPreview,
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Maximum whitespace, typography-focused, no frills",
    Preview: MinimalPreview,
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Serif font, black & white, centered underlined section headers",
    Preview: EditorialPreview,
  },
  {
    id: "bold",
    name: "Bold",
    description: "Georgia font, warm terracotta accents, high contrast",
    Preview: BoldPreview,
  },
  {
    id: "sharp",
    name: "Sharp",
    description: "Clean sans-serif, dark navy headings, ruled section dividers",
    Preview: SharpPreview,
  },
];

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
          <div className="h-40 rounded mb-3 border border-gray-100 overflow-hidden bg-white">
            <t.Preview />
          </div>
          <h3 className="font-medium">{t.name}</h3>
          <p className="text-xs text-gray-500">{t.description}</p>
        </button>
      ))}
    </div>
  );
}
