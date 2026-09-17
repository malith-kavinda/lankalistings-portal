/** What is about to be uploaded, with whatever is wrong with it shown against the file itself. */

import { FileImage, X } from "lucide-react";
import { formatBytes } from "../../lib/format";
import type { UploadProblem } from "../../lib/uploadValidation";

type SelectedFileListProps = {
  files: File[];
  problems: UploadProblem[];
  duplicates: string[];
  onRemove: (index: number) => void;
  onClear: () => void;
  disabled?: boolean;
};

export function SelectedFileList({
  files,
  problems,
  duplicates,
  onRemove,
  onClear,
  disabled,
}: SelectedFileListProps) {
  if (files.length === 0) {
    return null;
  }

  const total = files.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-sm font-bold">
          {files.length} {files.length === 1 ? "image" : "images"}
          <span className="ml-2 font-normal text-subtle">{formatBytes(total)}</span>
        </p>
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          className="text-xs font-bold uppercase text-subtle hover:text-danger disabled:opacity-50"
        >
          Clear
        </button>
      </div>

      <ul className="divide-y divide-line">
        {files.map((file, index) => {
          const fileProblems = problems.filter((problem) => problem.filename === file.name);
          const isDuplicate = duplicates.includes(file.name);
          return (
            <li key={`${file.name}-${index}`} className="flex items-start gap-3 px-4 py-3">
              <FileImage size={18} className="mt-0.5 shrink-0 text-subtle" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-subtle">{formatBytes(file.size)}</p>
                {isDuplicate ? (
                  <p className="mt-1 text-xs text-amber">
                    Another selected file has this name. The server deduplicates identical images
                    but will still create an item for each.
                  </p>
                ) : null}
                {fileProblems.map((problem, problemIndex) => (
                  <p key={problemIndex} className="mt-1 text-xs font-bold text-danger">
                    {problem.message}
                  </p>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onRemove(index)}
                disabled={disabled}
                aria-label={`Remove ${file.name}`}
                className="shrink-0 rounded p-1 text-subtle hover:bg-muted hover:text-danger disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
