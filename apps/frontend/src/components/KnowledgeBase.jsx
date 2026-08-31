import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, UploadCloud, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { api } from "../lib/api";

export default function KnowledgeBase() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // File Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState("");

  // Delete All State
  const [deletingAll, setDeletingAll] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await api.listKnowledge();
      setEntries(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.addKnowledge({ question, answer });
      setQuestion("");
      setAnswer("");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(e) {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    setError("");
    setUploadSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await api.uploadKnowledgeFile(formData);
      setUploadSuccess(`Successfully extracted and added ${res.added_count} Q&A entries from ${selectedFile.name}!`);
      setSelectedFile(null);
      setShowUpload(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this knowledge entry?")) return;
    try {
      await api.deleteKnowledge(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteAll() {
    if (!confirm("Are you sure you want to delete ALL knowledge base entries? This action cannot be undone.")) return;
    setDeletingAll(true);
    setError("");
    setUploadSuccess("");
    try {
      const res = await api.deleteAllKnowledge();
      setUploadSuccess(`Successfully deleted all ${res.count || entries.length} knowledge base entries.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingAll(false);
    }
  }

  function startEdit(entry) {
    setEditingId(entry.id);
    setEditQuestion(entry.question);
    setEditAnswer(entry.answer);
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditQuestion("");
    setEditAnswer("");
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!editingId) return;
    setUpdating(true);
    setError("");
    try {
      await api.updateKnowledge(editingId, { question: editQuestion, answer: editAnswer });
      cancelEdit();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-semibold">Knowledge base</h1>
          <p className="text-ink-muted text-sm mt-1">
            The agent answers customers using only what's here.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {entries.length > 0 && (
            <button
              onClick={handleDeleteAll}
              disabled={deletingAll}
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 text-red-600 text-sm font-medium px-3.5 py-2.5 hover:bg-red-100 transition disabled:opacity-50"
            >
              {deletingAll ? (
                <Loader2 size={16} className="animate-spin text-red-600" />
              ) : (
                <Trash2 size={16} className="text-red-600" />
              )}
              Delete All
            </button>
          )}
          <button
            onClick={() => {
              setShowUpload((v) => !v);
              setShowForm(false);
              setError("");
            }}
            className="flex items-center gap-2 rounded-lg border border-line bg-surface text-ink text-sm font-medium px-3.5 py-2.5 hover:bg-bg transition"
          >
            <UploadCloud size={16} className="text-accent" />
            Upload Document (CSV/PDF/Word)
          </button>
          <button
            onClick={() => {
              setShowForm((v) => !v);
              setShowUpload(false);
              setError("");
            }}
            className="flex items-center gap-2 rounded-lg bg-accent text-white text-sm font-medium px-4 py-2.5 hover:opacity-90 transition"
          >
            <Plus size={16} />
            Add entry
          </button>
        </div>
      </div>

      {uploadSuccess && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 p-4 flex items-center gap-3 text-sm">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {showUpload && (
        <form onSubmit={handleFileUpload} className="mb-6 rounded-xl border border-line bg-surface p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Auto-Extract Q&A from Document</label>
            <p className="text-xs text-ink-muted mb-3">
              Upload a CSV, PDF, Word (.docx), or TXT document. Question-and-answer pairs will be automatically extracted directly into your knowledge base.
            </p>

            <div className="border-2 border-dashed border-line hover:border-accent rounded-xl p-6 text-center cursor-pointer transition bg-bg/50">
              <input
                type="file"
                accept=".csv, .pdf, .docx, .doc, .txt"
                onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                className="hidden"
                id="file-upload-input"
              />
              <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center gap-2">
                <FileText size={32} className="text-accent/80" />
                {selectedFile ? (
                  <div>
                    <p className="font-medium text-sm text-ink">{selectedFile.name}</p>
                    <p className="text-xs text-ink-muted">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-sm text-ink">Click to select file</p>
                    <p className="text-xs text-ink-muted">Supports CSV, PDF, Word (.docx), TXT</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowUpload(false);
                setSelectedFile(null);
              }}
              className="rounded-lg text-sm font-medium px-4 py-2 text-ink-muted hover:bg-bg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="flex items-center gap-2 rounded-lg bg-accent text-white text-sm font-medium px-4 py-2 hover:opacity-90 transition disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Extracting Q&As…
                </>
              ) : (
                "Extract & Import Q&As"
              )}
            </button>
          </div>
        </form>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="mb-6 rounded-xl border border-line bg-surface p-5 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Question</label>
            <input
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full rounded-lg border border-line px-3.5 py-2.5 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition"
              placeholder="What are your clinic hours?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Answer</label>
            <textarea
              required
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-line px-3.5 py-2.5 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition resize-none"
              placeholder="We're open Monday to Saturday, 10am to 8pm."
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent text-white text-sm font-medium px-4 py-2 hover:opacity-90 transition disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg text-sm font-medium px-4 py-2 text-ink-muted hover:bg-bg transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-red-600 mb-4 font-medium">{error}</p>}

      {loading ? (
        <p className="text-ink-muted text-sm">Loading…</p>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-ink-muted border border-dashed border-line rounded-xl bg-surface/50">
          <p className="font-medium text-ink">No entries yet.</p>
          <p className="text-xs mt-1 text-ink-muted">Add questions manually or upload a CSV, PDF, or Word document to auto-extract FAQs.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-line bg-surface p-4">
              {editingId === entry.id ? (
                <form onSubmit={handleUpdate} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-muted mb-1">Edit Question</label>
                    <input
                      required
                      value={editQuestion}
                      onChange={(e) => setEditQuestion(e.target.value)}
                      className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-muted mb-1">Edit Answer</label>
                    <textarea
                      required
                      value={editAnswer}
                      onChange={(e) => setEditAnswer(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent transition resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={updating}
                      className="rounded-lg bg-accent text-white text-xs font-medium px-3 py-1.5 hover:opacity-90 transition disabled:opacity-60"
                    >
                      {updating ? "Saving…" : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-lg text-xs font-medium px-3 py-1.5 text-ink-muted hover:bg-bg transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{entry.question}</p>
                    <p className="text-ink-muted text-sm mt-1 whitespace-pre-wrap">{entry.answer}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(entry)}
                      className="text-xs text-accent font-medium hover:underline border border-line px-2.5 py-1 rounded-lg hover:bg-accent/5 transition flex items-center gap-1"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      className="text-xs text-red-600 font-medium hover:underline border border-line px-2.5 py-1 rounded-lg hover:bg-red-50 transition flex items-center gap-1"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
