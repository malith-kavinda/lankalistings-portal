/**
 * The raw text, exactly as the engine read it.
 *
 * A `<pre>` with `whitespace-pre-wrap` rather than a paragraph, because the line breaks carry
 * meaning — column boundaries, one advertisement ending and the next beginning — and collapsing
 * them discards the only structural signal a reviewer has.
 *
 * The blocks this candidate came from are listed separately and highlighted, so "the price came
 * from block 4" is answerable without re-reading the page.
 */

import { useState } from "react";

type OcrTextPanelProps = {
  text: string;
  blocks: { id: number; text: string; confidence?: number | null }[];
  highlightedBlockIds: number[];
};

export function OcrTextPanel({ text, blocks, highlightedBlockIds }: OcrTextPanelProps) {
  const [showAllBlocks, setShowAllBlocks] = useState(false);
  const highlighted = new Set(highlightedBlockIds);
  const visible = showAllBlocks ? blocks : blocks.filter((block) => highlighted.has(block.id));

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wide text-subtle">
            Extracted text
          </h3>
          <span className="font-mono text-[11px] text-subtle">
            {[...text].length} characters
          </span>
        </div>
        {/*
          `lang` is not set: a page is routinely Sinhala and English together, and claiming one
          would tell a screen reader to mispronounce the other.
        */}
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-line bg-muted p-3 text-sm leading-relaxed">
          {text || "No text was extracted from this page."}
        </pre>
      </div>

      {blocks.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wide text-subtle">
              Source blocks
            </h3>
            <button
              type="button"
              onClick={() => setShowAllBlocks((current) => !current)}
              className="text-xs font-bold text-emerald underline underline-offset-2"
            >
              {showAllBlocks
                ? `Show only this candidate's ${highlighted.size}`
                : `Show all ${blocks.length}`}
            </button>
          </div>
          <ul className="space-y-1.5">
            {visible.map((block) => (
              <li
                key={block.id}
                className={`rounded border px-3 py-2 text-sm ${
                  highlighted.has(block.id)
                    ? "border-emerald/40 bg-emerald/5"
                    : "border-line bg-surface"
                }`}
              >
                <span className="mr-2 font-mono text-[11px] font-bold text-subtle">
                  #{block.id}
                </span>
                <span className="whitespace-pre-wrap break-words">{block.text}</span>
              </li>
            ))}
            {visible.length === 0 ? (
              <li className="rounded border border-line bg-surface px-3 py-2 text-sm text-subtle">
                This candidate records no source blocks.
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
