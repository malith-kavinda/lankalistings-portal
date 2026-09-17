/**
 * Batch intake (PRD 14.1).
 *
 * Upload answers 202, not 200: the batch is durable, nothing has been extracted yet. So this screen
 * does not wait for a result — it hands off to the progress route, which is the resource the
 * `Location` header points at.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileDropZone } from "../components/intake/FileDropZone";
import { SelectedFileList } from "../components/intake/SelectedFileList";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { createBatch, getIngestionLimits } from "../lib/api/ingestion";
import { operatorId } from "../lib/operator";
import { queryKeys } from "../lib/queries";
import { duplicateNames, validateSelection } from "../lib/uploadValidation";

export function IntakeRoute() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);

  const { data: limits } = useQuery({
    queryKey: queryKeys.limits(),
    queryFn: ({ signal }) => getIngestionLimits(signal),
    // The server's limits do not change between deploys, so re-reading them per visit is waste.
    staleTime: Number.POSITIVE_INFINITY,
  });

  const problems = useMemo(() => validateSelection(files, limits), [files, limits]);
  const duplicates = useMemo(() => duplicateNames(files), [files]);
  const canUpload = files.length > 0 && problems.length === 0;

  const upload = useMutation({
    mutationFn: () => createBatch(files, { operatorId: operatorId() }),
    onSuccess: (batch) => {
      setFiles([]);
      void queryClient.invalidateQueries({ queryKey: queryKeys.batches() });
      queryClient.setQueryData(queryKeys.batch(batch.id), batch);
      navigate(`/batches/${batch.id}`);
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Batch intake</h1>
        <p className="mt-1 text-sm text-subtle">
          Upload scanned newspaper pages. Each image becomes an item that is read, extracted, and
          queued for review — nothing is published without a person approving it.
        </p>
      </header>

      <FileDropZone
        onFilesSelected={(selected) => setFiles((current) => [...current, ...selected])}
        limits={limits}
        disabled={upload.isPending}
      />

      <SelectedFileList
        files={files}
        problems={problems}
        duplicates={duplicates}
        onRemove={(index) => setFiles((current) => current.filter((_, i) => i !== index))}
        onClear={() => setFiles([])}
        disabled={upload.isPending}
      />

      {/* Set-level problems: the per-file ones are rendered against their own row above. */}
      {problems
        .filter((problem) => !problem.filename)
        .map((problem, index) => (
          <p key={index} className="text-sm font-bold text-danger">
            {problem.message}
          </p>
        ))}

      {upload.error ? (
        <ErrorBanner error={upload.error} onDismiss={() => upload.reset()} />
      ) : null}

      <button
        type="button"
        onClick={() => upload.mutate()}
        disabled={!canUpload || upload.isPending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded bg-frame px-4 text-sm font-bold text-white disabled:opacity-50"
      >
        {upload.isPending ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Uploading {files.length} {files.length === 1 ? "image" : "images"}…
          </>
        ) : (
          <>
            <UploadCloud size={18} />
            Upload {files.length > 0 ? `${files.length} ` : ""}
            {files.length === 1 ? "image" : "images"}
          </>
        )}
      </button>
    </div>
  );
}
