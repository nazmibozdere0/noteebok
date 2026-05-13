'use client'

interface PersonChipProps {
  name: string
}

// Visually distinct from topic tags:
// - Pill shape (rounded-full) vs rectangular (rounded-md)
// - Letter avatar as a visual anchor — immediately reads as "a person"
// - Neutral slate palette so it never clashes with topic tag colors
export default function PersonChip({ name }: PersonChipProps) {
  return (
    <span className="inline-flex items-center gap-1 pl-0.5 pr-2 py-0.5 rounded-full flex-shrink-0
                     bg-zinc-800 border border-zinc-700">
      {/* Initial avatar */}
      <span className="w-3.5 h-3.5 rounded-full bg-zinc-600 flex items-center justify-center flex-shrink-0">
        <span className="text-[8px] font-bold text-zinc-200 leading-none">
          {name[0].toUpperCase()}
        </span>
      </span>
      <span className="text-[10px] font-medium text-zinc-300">{name}</span>
    </span>
  )
}
