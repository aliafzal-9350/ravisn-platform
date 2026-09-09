import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    BookOpen,
    Check,
    CheckCircle2,
    FileText,
    Loader2,
    Pencil,
    Plus,
    Search,
    Trash2,
    UploadCloud,
    X,
} from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface KnowledgeEntry {
    id: string;
    question: string;
    answer: string;
    created_at?: string;
}

export interface KnowledgeProps {
    knowledgeBase?: {
        id: string;
        name: string;
        description: string;
        embedding_model: string;
        dimension: number;
    };
    entries?: KnowledgeEntry[];
    documents?: any[];
    stats?: {
        total_entries?: number;
        total_chunks?: number;
        embedding_dimension?: number;
        index_type?: string;
        index_status?: string;
    };
}

export default function KnowledgeIndex({
    knowledgeBase,
    entries = [],
    stats,
}: KnowledgeProps) {
    const [searchQuery, setSearchQuery] = React.useState('');

    // Inline Add Entry state
    const [isAddingEntry, setIsAddingEntry] = React.useState(false);
    const [newQuestion, setNewQuestion] = React.useState('');
    const [newAnswer, setNewAnswer] = React.useState('');
    const [isSavingEntry, setIsSavingEntry] = React.useState(false);

    // Inline Edit Entry state
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [editQuestion, setEditQuestion] = React.useState('');
    const [editAnswer, setEditAnswer] = React.useState('');
    const [isUpdatingEntry, setIsUpdatingEntry] = React.useState(false);

    // Delete single entry modal state
    const [deletingEntry, setDeletingEntry] = React.useState<KnowledgeEntry | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);

    // Delete all modal state
    const [deleteAllOpen, setDeleteAllOpen] = React.useState(false);
    const [isDeletingAll, setIsDeletingAll] = React.useState(false);

    // Document Upload Modal state
    const [uploadModalOpen, setUploadModalOpen] = React.useState(false);
    const [uploadTitle, setUploadTitle] = React.useState('');
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [isUploading, setIsUploading] = React.useState(false);
    const [isDragging, setIsDragging] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Filtered entries by search query
    const filteredEntries = React.useMemo(() => {
        if (!searchQuery.trim()) return entries;
        const q = searchQuery.toLowerCase();
        return entries.filter(
            (item) =>
                item.question?.toLowerCase().includes(q) ||
                item.answer?.toLowerCase().includes(q)
        );
    }, [entries, searchQuery]);

    // Handle Save New Entry
    const handleSaveNewEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newQuestion.trim() || !newAnswer.trim()) {
            toast.error('Please provide both a question and an answer.');
            return;
        }

        setIsSavingEntry(true);
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch('/dashboard/knowledge/entry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    question: newQuestion.trim(),
                    answer: newAnswer.trim(),
                }),
            });

            if (res.ok) {
                toast.success('Knowledge entry saved and embedded successfully.');
                setNewQuestion('');
                setNewAnswer('');
                setIsAddingEntry(false);
                router.reload({ only: ['entries', 'stats'] });
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.message || 'Failed to save entry.');
            }
        } catch {
            toast.error('Network error while saving knowledge entry.');
        } finally {
            setIsSavingEntry(false);
        }
    };

    // Start editing an entry
    const handleStartEdit = (entry: KnowledgeEntry) => {
        setEditingId(entry.id);
        setEditQuestion(entry.question);
        setEditAnswer(entry.answer);
    };

    // Cancel editing
    const handleCancelEdit = () => {
        setEditingId(null);
        setEditQuestion('');
        setEditAnswer('');
    };

    // Handle Update Entry
    const handleUpdateEntry = async (e: React.FormEvent, entryId: string) => {
        e.preventDefault();
        if (!editQuestion.trim() || !editAnswer.trim()) {
            toast.error('Question and answer cannot be empty.');
            return;
        }

        setIsUpdatingEntry(true);
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch(`/dashboard/knowledge/entry/${entryId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    question: editQuestion.trim(),
                    answer: editAnswer.trim(),
                }),
            });

            if (res.ok) {
                toast.success('Knowledge entry updated.');
                handleCancelEdit();
                router.reload({ only: ['entries', 'stats'] });
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.message || 'Failed to update entry.');
            }
        } catch {
            toast.error('Network error while updating entry.');
        } finally {
            setIsUpdatingEntry(false);
        }
    };

    // Handle Confirm Delete Single Entry
    const handleConfirmDeleteEntry = async () => {
        if (!deletingEntry) return;

        setIsDeleting(true);
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch(`/dashboard/knowledge/entry/${deletingEntry.id}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
            });

            if (res.ok) {
                toast.success('Knowledge entry deleted.');
                setDeletingEntry(null);
                router.reload({ only: ['entries', 'stats'] });
            } else {
                toast.error('Failed to delete entry.');
            }
        } catch {
            toast.error('Network error while deleting entry.');
        } finally {
            setIsDeleting(false);
        }
    };

    // Handle Confirm Delete All
    const handleConfirmDeleteAll = async () => {
        setIsDeletingAll(true);
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch('/dashboard/knowledge/delete-all', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
            });

            if (res.ok) {
                toast.success('All knowledge base entries have been deleted.');
                setDeleteAllOpen(false);
                router.reload({ only: ['entries', 'stats'] });
            } else {
                toast.error('Failed to delete entries.');
            }
        } catch {
            toast.error('Network error while deleting entries.');
        } finally {
            setIsDeletingAll(false);
        }
    };

    // Handle File Drop & Select
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            if (!uploadTitle) setUploadTitle(file.name);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            setSelectedFile(file);
            if (!uploadTitle) setUploadTitle(file.name);
        }
    };

    // Handle Document Upload
    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            toast.error('Please select a file to upload.');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('title', uploadTitle || selectedFile.name);
        formData.append('file', selectedFile);

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch('/dashboard/knowledge/upload', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: formData,
            });

            if (res.ok) {
                const data = await res.json().catch(() => ({}));
                toast.success(data.message || 'Document indexed into knowledge base.');
                setUploadModalOpen(false);
                setSelectedFile(null);
                setUploadTitle('');
                router.reload({ only: ['entries', 'stats'] });
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error || 'Upload failed.');
            }
        } catch {
            toast.error('Failed to upload document.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <>
            <Head title="Knowledge Base - RAVISN AI" />

            <div className="mx-auto max-w-5xl py-4">
                {/* 1. Page Header matching Reference Screenshot */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Knowledge base
                        </h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            The agent answers customers using only what&apos;s here.
                        </p>
                    </div>

                    {/* Action Buttons Top Right */}
                    <div className="flex flex-wrap items-center gap-2.5 sm:self-start">
                        {entries.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteAllOpen(true)}
                                className="h-9 gap-1.5 border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-xs font-semibold rounded-lg shadow-2xs transition-colors"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete All</span>
                            </Button>
                        )}

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUploadModalOpen(true)}
                            className="h-9 gap-1.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold rounded-lg shadow-2xs transition-colors"
                        >
                            <UploadCloud className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                            <span>Upload Document (CSV/PDF/Word)</span>
                        </Button>

                        <Button
                            size="sm"
                            onClick={() => {
                                setIsAddingEntry(!isAddingEntry);
                                if (!isAddingEntry) {
                                    handleCancelEdit();
                                }
                            }}
                            className="h-9 gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-4 rounded-lg shadow-2xs transition-all"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add entry</span>
                        </Button>
                    </div>
                </div>

                {/* 2. Optional Quick Search if many entries */}
                {entries.length > 3 && (
                    <div className="mb-6 relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Search knowledge base entries..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-10 pl-10 pr-4 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm shadow-2xs"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                )}

                {/* 3. Inline Add Entry Form (Shown in Reference Screenshot 2) */}
                {isAddingEntry && (
                    <div className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card p-6 shadow-2xs animate-in fade-in slide-in-from-top-2 duration-200">
                        <form onSubmit={handleSaveNewEntry}>
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        Question
                                    </Label>
                                    <Input
                                        type="text"
                                        placeholder="What are your clinic hours?"
                                        value={newQuestion}
                                        onChange={(e) => setNewQuestion(e.target.value)}
                                        className="mt-1.5 h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-sm focus-visible:ring-2 focus-visible:ring-sky-500"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        Answer
                                    </Label>
                                    <Textarea
                                        placeholder="We're open Monday to Saturday, 10am to 8pm."
                                        rows={4}
                                        value={newAnswer}
                                        onChange={(e) => setNewAnswer(e.target.value)}
                                        className="mt-1.5 min-h-[110px] rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-3.5 text-sm focus-visible:ring-2 focus-visible:ring-sky-500 resize-y"
                                    />
                                </div>
                            </div>

                            <div className="mt-5 flex items-center gap-3">
                                <Button
                                    type="submit"
                                    disabled={isSavingEntry}
                                    className="bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold px-6 py-2 rounded-xl shadow-2xs flex items-center gap-2"
                                >
                                    {isSavingEntry && <Loader2 className="h-4 w-4 animate-spin" />}
                                    <span>Save</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    disabled={isSavingEntry}
                                    onClick={() => {
                                        setIsAddingEntry(false);
                                        setNewQuestion('');
                                        setNewAnswer('');
                                    }}
                                    className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium px-4 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {/* 4. Q&A Entries Cards List */}
                {filteredEntries.length > 0 ? (
                    <div className="space-y-4">
                        {filteredEntries.map((entry) => {
                            const isEditingThis = editingId === entry.id;

                            if (isEditingThis) {
                                return (
                                    <div
                                        key={entry.id}
                                        className="rounded-2xl border border-sky-500/50 bg-white dark:bg-card p-6 shadow-xs animate-in fade-in duration-150"
                                    >
                                        <form onSubmit={(e) => handleUpdateEntry(e, entry.id)}>
                                            <div className="space-y-4">
                                                <div>
                                                    <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                        Question
                                                    </Label>
                                                    <Input
                                                        type="text"
                                                        value={editQuestion}
                                                        onChange={(e) => setEditQuestion(e.target.value)}
                                                        className="mt-1.5 h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-sm focus-visible:ring-2 focus-visible:ring-sky-500"
                                                        autoFocus
                                                    />
                                                </div>

                                                <div>
                                                    <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                        Answer
                                                    </Label>
                                                    <Textarea
                                                        rows={4}
                                                        value={editAnswer}
                                                        onChange={(e) => setEditAnswer(e.target.value)}
                                                        className="mt-1.5 min-h-[110px] rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-3.5 text-sm focus-visible:ring-2 focus-visible:ring-sky-500 resize-y"
                                                    />
                                                </div>
                                            </div>

                                            <div className="mt-5 flex items-center gap-3">
                                                <Button
                                                    type="submit"
                                                    disabled={isUpdatingEntry}
                                                    className="bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold px-6 py-2 rounded-xl shadow-2xs flex items-center gap-2"
                                                >
                                                    {isUpdatingEntry && <Loader2 className="h-4 w-4 animate-spin" />}
                                                    <span>Save</span>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    disabled={isUpdatingEntry}
                                                    onClick={handleCancelEdit}
                                                    className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium px-4 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </form>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={entry.id}
                                    className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-card p-6 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-150"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                            {entry.question}
                                        </h3>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleStartEdit(entry)}
                                                className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                                <span>Edit</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDeletingEntry(entry)}
                                                className="flex items-center gap-1.5 text-xs font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                <span>Delete</span>
                                            </button>
                                        </div>
                                    </div>
                                    <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                        {entry.answer}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* 5. Clean Empty State */
                    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 p-12 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 mb-4">
                            <BookOpen className="h-6 w-6" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {searchQuery ? 'No matching entries found' : 'No knowledge entries yet'}
                        </h3>
                        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                            {searchQuery
                                ? `No questions or answers match "${searchQuery}". Try a different search term or clear the filter.`
                                : 'Add your company information, clinic hours, pricing, FAQs, or policies so the AI agent can accurately answer your customers.'}
                        </p>
                        {!searchQuery && (
                            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                                <Button
                                    onClick={() => setIsAddingEntry(true)}
                                    className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-2xs gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>Add entry</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setUploadModalOpen(true)}
                                    className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold px-4 py-2 rounded-xl shadow-2xs gap-2"
                                >
                                    <UploadCloud className="h-4 w-4 text-sky-600" />
                                    <span>Upload Document</span>
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal 1: Delete Single Entry Confirmation */}
            <Dialog open={Boolean(deletingEntry)} onOpenChange={(open) => !open && setDeletingEntry(null)}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 mb-2">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            Delete Knowledge Entry
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                            Are you sure you want to delete &ldquo;{deletingEntry?.question}&rdquo;? The AI agent will no longer be able to use this answer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 gap-2">
                        <Button
                            variant="ghost"
                            disabled={isDeleting}
                            onClick={() => setDeletingEntry(null)}
                            className="rounded-xl text-xs font-semibold"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={isDeleting}
                            onClick={handleConfirmDeleteEntry}
                            className="rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 gap-2"
                        >
                            {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            <span>Delete Entry</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal 2: Delete All Entries Confirmation */}
            <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 mb-2">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            Delete All Knowledge Base Entries?
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                            This will permanently delete all {entries.length} knowledge entries and vector embeddings. The AI agent will no longer have access to this information. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 gap-2">
                        <Button
                            variant="ghost"
                            disabled={isDeletingAll}
                            onClick={() => setDeleteAllOpen(false)}
                            className="rounded-xl text-xs font-semibold"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={isDeletingAll}
                            onClick={handleConfirmDeleteAll}
                            className="rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 gap-2"
                        >
                            {isDeletingAll && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            <span>Delete All Entries</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal 3: Upload Document (CSV/PDF/Word) */}
            <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
                <DialogContent className="max-w-lg rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            Upload Document
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                            Upload a CSV, PDF, Word (.doc, .docx), or TXT file. CSV files containing question and answer columns are automatically converted to individual Q&A cards.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleUploadSubmit} className="space-y-4 mt-2">
                        <div>
                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Document Title (Optional)
                            </Label>
                            <Input
                                type="text"
                                placeholder="e.g. Clinic Services & Pricing 2026"
                                value={uploadTitle}
                                onChange={(e) => setUploadTitle(e.target.value)}
                                className="mt-1 h-10 rounded-xl border-slate-200 dark:border-slate-800 text-xs"
                            />
                        </div>

                        {/* Drag & Drop Area */}
                        <div>
                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                File Attachment
                            </Label>
                            <div
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`mt-1.5 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                                    isDragging
                                        ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30'
                                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900'
                                }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,.pdf,.doc,.docx,.txt"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 mb-2">
                                    <UploadCloud className="h-5 w-5" />
                                </div>
                                {selectedFile ? (
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 justify-center">
                                            <FileText className="h-3.5 w-3.5 text-sky-600" />
                                            <span>{selectedFile.name}</span>
                                        </p>
                                        <p className="text-[11px] text-slate-400">
                                            {(selectedFile.size / 1024).toFixed(1)} KB • Ready for indexing
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                            Click to browse or drag and drop
                                        </p>
                                        <p className="text-[11px] text-slate-400">
                                            Supports CSV, PDF, Word (.docx), TXT (max 10MB)
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="mt-4 gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={isUploading}
                                onClick={() => {
                                    setUploadModalOpen(false);
                                    setSelectedFile(null);
                                    setUploadTitle('');
                                }}
                                className="rounded-xl text-xs font-semibold"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isUploading || !selectedFile}
                                className="rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white gap-2"
                            >
                                {isUploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                <span>Ingest Document</span>
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
