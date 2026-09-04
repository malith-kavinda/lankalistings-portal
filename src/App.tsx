import { FormEvent, useEffect, useState } from "react";
import {
  Bell,
  CheckCircle,
  FileImage,
  Gauge,
  LayoutDashboard,
  Megaphone,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users
} from "lucide-react";
import {
  Advertisement,
  AdvertisementUpdateData,
  approveAdvertisement,
  extractNewspaperArticle,
  listAdvertisements,
  listReviewAdvertisements,
  updateAdvertisement
} from "./lib/advertisements";
import { metrics } from "./lib/data";

const nav = [
  { label: "Dashboard", Icon: LayoutDashboard, active: true },
  { label: "Article Intake", Icon: FileImage },
  { label: "Review Queue", Icon: ShieldCheck },
  { label: "Published Ads", Icon: Megaphone },
  { label: "Users", Icon: Users }
];

const categories = ["Vehicles", "Property", "Electronics", "Jobs", "Home", "Land"];

const emptyDraft: AdvertisementUpdateData = {
  title: "",
  price: "",
  category: "Vehicles",
  location: "",
  description: ""
};

function StatusChip({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "bg-emerald/10 text-emerald"
      : status === "pending_review"
        ? "bg-amber/10 text-amber"
        : "bg-danger/10 text-danger";

  return <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${tone}`}>{status.replace("_", " ")}</span>;
}

const trendToneClasses: Record<string, string> = {
  amber: "text-amber",
  emerald: "text-emerald",
  danger: "text-danger",
  slate: "text-slate"
};

function toDraft(advertisement: Advertisement): AdvertisementUpdateData {
  return {
    title: advertisement.title,
    price: advertisement.price,
    category: advertisement.category,
    location: advertisement.location,
    description: advertisement.description
  };
}

export default function App() {
  const [reviewQueue, setReviewQueue] = useState<Advertisement[]>([]);
  const [publishedAds, setPublishedAds] = useState<Advertisement[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<Advertisement | null>(null);
  const [draftForm, setDraftForm] = useState<AdvertisementUpdateData>(emptyDraft);
  const [articleImage, setArticleImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [detectedText, setDetectedText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    void refreshQueues();
  }, []);

  useEffect(() => {
    if (!articleImage) {
      setImagePreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(articleImage);
    setImagePreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [articleImage]);

  async function refreshQueues() {
    setIsLoading(true);
    try {
      const [pending, published] = await Promise.all([
        listReviewAdvertisements(),
        listAdvertisements()
      ]);
      setReviewQueue(pending);
      setPublishedAds(published);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load advertisements.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExtract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage("");
    setErrorMessage("");

    if (!articleImage) {
      setErrorMessage("Newspaper article image is required.");
      return;
    }

    setIsExtracting(true);
    try {
      const extraction = await extractNewspaperArticle(articleImage);
      setDetectedText(extraction.detected_text);
      setSelectedDraft(extraction.advertisement);
      setDraftForm(toDraft(extraction.advertisement));
      setReviewQueue((current) => [extraction.advertisement, ...current]);
      setArticleImage(null);
      setStatusMessage("OCR draft created. Review and approve before publishing.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to extract article.");
    } finally {
      setIsExtracting(false);
    }
  }

  function selectForReview(advertisement: Advertisement) {
    setSelectedDraft(advertisement);
    setDraftForm(toDraft(advertisement));
    setDetectedText(advertisement.source_text);
    setStatusMessage("");
    setErrorMessage("");
  }

  async function handleSaveDraft() {
    if (!selectedDraft) {
      return;
    }

    setStatusMessage("");
    setErrorMessage("");

    try {
      const updated = await updateAdvertisement(selectedDraft.id, draftForm);
      setSelectedDraft(updated);
      setReviewQueue((current) =>
        current.map((advertisement) => (advertisement.id === updated.id ? updated : advertisement))
      );
      setStatusMessage("Draft changes saved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save draft.");
    }
  }

  async function handleApprove() {
    if (!selectedDraft) {
      return;
    }

    setIsApproving(true);
    setStatusMessage("");
    setErrorMessage("");

    try {
      const updated = await updateAdvertisement(selectedDraft.id, draftForm);
      const approved = await approveAdvertisement(updated.id);
      setSelectedDraft(null);
      setDraftForm(emptyDraft);
      setDetectedText("");
      setReviewQueue((current) =>
        current.filter((advertisement) => advertisement.id !== approved.id)
      );
      setPublishedAds((current) => [approved, ...current]);
      setStatusMessage("Advertisement approved and published.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to approve advertisement.");
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-text">
      <aside className="fixed left-0 top-0 hidden h-full w-[260px] flex-col bg-frame text-white lg:flex">
        <div className="flex h-16 items-center px-6 text-lg font-bold">LankaListings</div>
        <nav className="space-y-1 px-3">
          {nav.map(({ label, Icon, active }) => (
            <button
              key={label}
              className={`flex w-full items-center gap-3 rounded px-4 py-3 text-left text-sm ${
                active ? "border-l-4 border-emerald bg-white/10 text-white" : "text-slate-300 hover:bg-white/10"
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-white/90 px-5 backdrop-blur lg:px-8">
          <label className="flex h-10 w-full max-w-md items-center gap-2 rounded border border-line bg-muted px-3">
            <Search size={18} className="text-slate" />
            <input className="w-full bg-transparent text-sm outline-none" placeholder="Search review queue..." />
            <span className="hidden rounded border border-line bg-white px-2 py-0.5 text-xs text-slate sm:inline">Cmd K</span>
          </label>
          <div className="ml-4 flex items-center gap-5">
            <button className="relative text-slate">
              <Bell size={20} />
              <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-danger" />
            </button>
            <div className="hidden border-l border-line pl-5 text-right sm:block">
              <p className="text-sm font-bold">Admin User</p>
              <p className="text-xs uppercase text-slate">OCR Reviewer</p>
            </div>
          </div>
        </header>

        <main className="p-5 lg:p-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-normal">Operations Dashboard</h1>
              <p className="mt-1 text-sm text-slate">Newspaper OCR intake, human verification, and public publishing.</p>
            </div>
            <button className="hidden items-center gap-2 rounded bg-frame px-4 py-2 text-sm font-bold text-white sm:flex">
              <Gauge size={18} />
              {reviewQueue.length} To Review
            </button>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <article key={metric.label} className="rounded-lg border border-line bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate">{metric.label}</span>
                  <CheckCircle size={18} className="text-slate" />
                </div>
                <p className="font-mono text-3xl font-bold tabular-nums">{metric.value}</p>
                <p className={`mt-1 text-sm ${trendToneClasses[metric.tone]}`}>{metric.trend}</p>
              </article>
            ))}
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
            <form onSubmit={handleExtract} className="rounded-lg border border-line bg-white p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-emerald/10 text-emerald">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Newspaper OCR Intake</h2>
                  <p className="text-sm text-slate">Upload Sinhala article images to create draft ads.</p>
                </div>
              </div>

              <label className="grid gap-2 rounded border border-dashed border-line bg-muted p-4 text-sm font-bold">
                Article image
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/tiff,image/bmp"
                  onChange={(event) => setArticleImage(event.target.files?.[0] ?? null)}
                  required
                />
                {imagePreview ? (
                  <img src={imagePreview} alt="" className="h-52 w-full rounded object-cover" />
                ) : (
                  <span className="flex h-44 items-center justify-center gap-2 rounded bg-white text-slate">
                    <UploadCloud size={18} />
                    Select newspaper image
                  </span>
                )}
              </label>

              <div className="mt-4 rounded border border-line bg-muted p-3 text-sm text-slate">
                Drafts are held for review. Only approved advertisements appear on the public site and mobile app.
              </div>

              {errorMessage ? <p className="mt-4 text-sm font-bold text-danger">{errorMessage}</p> : null}
              {statusMessage ? <p className="mt-4 text-sm font-bold text-emerald">{statusMessage}</p> : null}

              <button
                type="submit"
                disabled={isExtracting}
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded bg-frame px-4 text-sm font-bold text-white disabled:opacity-60"
              >
                <FileImage size={18} />
                {isExtracting ? "Extracting..." : "Extract Article"}
              </button>
            </form>

            <section className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-lg border border-line bg-white">
                <div className="border-b border-line p-5">
                  <h2 className="text-lg font-bold">Human Verification</h2>
                  <p className="text-sm text-slate">Review OCR text, correct the generated ad fields, then approve.</p>
                </div>

                {selectedDraft ? (
                  <div className="grid gap-5 p-5 lg:grid-cols-2">
                    <div className="space-y-4">
                      <img src={selectedDraft.image_url} alt="" className="h-48 w-full rounded object-cover" />
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <h3 className="text-sm font-bold uppercase text-slate">OCR text</h3>
                          <StatusChip status={selectedDraft.status} />
                        </div>
                        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded border border-line bg-muted p-3 text-sm leading-6 text-text">
                          {detectedText || "No OCR text captured."}
                        </pre>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <label className="grid gap-1 text-sm font-bold">
                        Title
                        <input
                          className="h-11 rounded border border-line px-3 font-normal outline-none focus:border-emerald"
                          value={draftForm.title}
                          onChange={(event) => setDraftForm((current) => ({ ...current, title: event.target.value }))}
                        />
                      </label>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="grid gap-1 text-sm font-bold">
                          Price
                          <input
                            className="h-11 rounded border border-line px-3 font-normal outline-none focus:border-emerald"
                            value={draftForm.price}
                            onChange={(event) => setDraftForm((current) => ({ ...current, price: event.target.value }))}
                          />
                        </label>
                        <label className="grid gap-1 text-sm font-bold">
                          Category
                          <select
                            className="h-11 rounded border border-line px-3 font-normal outline-none focus:border-emerald"
                            value={draftForm.category}
                            onChange={(event) => setDraftForm((current) => ({ ...current, category: event.target.value }))}
                          >
                            {categories.map((category) => (
                              <option key={category}>{category}</option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <label className="grid gap-1 text-sm font-bold">
                        Location
                        <input
                          className="h-11 rounded border border-line px-3 font-normal outline-none focus:border-emerald"
                          value={draftForm.location}
                          onChange={(event) => setDraftForm((current) => ({ ...current, location: event.target.value }))}
                        />
                      </label>

                      <label className="grid gap-1 text-sm font-bold">
                        Description
                        <textarea
                          className="min-h-28 rounded border border-line px-3 py-2 font-normal outline-none focus:border-emerald"
                          value={draftForm.description}
                          onChange={(event) => setDraftForm((current) => ({ ...current, description: event.target.value }))}
                        />
                      </label>

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={handleSaveDraft}
                          className="flex h-11 flex-1 items-center justify-center rounded border border-line px-4 text-sm font-bold"
                        >
                          Save Draft
                        </button>
                        <button
                          type="button"
                          onClick={handleApprove}
                          disabled={isApproving}
                          className="flex h-11 flex-1 items-center justify-center rounded bg-emerald px-4 text-sm font-bold text-white disabled:opacity-60"
                        >
                          {isApproving ? "Approving..." : "Approve & Publish"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-sm text-slate">Select a pending OCR draft to review.</div>
                )}
              </div>

              <div className="rounded-lg border border-line bg-white">
                <div className="border-b border-line p-5">
                  <h2 className="text-lg font-bold">Review Queue</h2>
                  <p className="text-sm text-slate">Pending OCR-generated advertisements.</p>
                </div>
                <div className="divide-y divide-line">
                  {isLoading ? (
                    <p className="p-5 text-sm text-slate">Loading queue...</p>
                  ) : reviewQueue.length === 0 ? (
                    <p className="p-5 text-sm text-slate">No pending drafts.</p>
                  ) : (
                    reviewQueue.map((advertisement) => (
                      <button
                        key={advertisement.id}
                        type="button"
                        onClick={() => selectForReview(advertisement)}
                        className="flex w-full gap-3 p-4 text-left hover:bg-muted"
                      >
                        <img src={advertisement.image_url} alt="" className="h-14 w-16 rounded object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold">{advertisement.title}</span>
                          <span className="block text-sm text-slate">{advertisement.price}</span>
                          <span className="mt-1 block text-xs uppercase text-amber">Pending review</span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </section>
          </section>

          <section className="mt-6 rounded-lg border border-line bg-white">
            <div className="border-b border-line p-5">
              <h2 className="text-lg font-bold">Published Advertisements</h2>
              <p className="text-sm text-slate">Approved records feeding public web and mobile apps.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="bg-muted text-xs uppercase text-slate">
                  <tr>
                    <th className="px-4 py-3">Advertisement</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {publishedAds.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-slate" colSpan={4}>
                        No approved advertisements yet.
                      </td>
                    </tr>
                  ) : (
                    publishedAds.map((advertisement) => (
                      <tr key={advertisement.id} className="h-14 border-t border-line hover:bg-muted">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img src={advertisement.image_url} alt="" className="h-11 w-14 rounded object-cover" />
                            <div>
                              <div className="font-semibold">{advertisement.title}</div>
                              <div className="text-xs text-slate">{advertisement.category}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold">{advertisement.price}</td>
                        <td className="px-4 py-3">{advertisement.location}</td>
                        <td className="px-4 py-3">
                          <StatusChip status={advertisement.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
