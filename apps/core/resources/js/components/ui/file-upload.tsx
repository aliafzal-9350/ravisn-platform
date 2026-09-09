import * as React from 'react';
import { cn } from '@/lib/utils';
import { UploadCloud, FileSpreadsheet, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
    onFileSelect: (file: File | null) => void;
    accept?: string;
    maxSizeMB?: number;
    className?: string;
}

export function FileUpload({
    onFileSelect,
    accept = '.csv',
    maxSizeMB = 5,
    className,
}: FileUploadProps) {
    const [dragActive, setDragActive] = React.useState(false);
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const validateFile = (file: File) => {
        setError(null);

        // Check size
        if (file.size > maxSizeMB * 1024 * 1024) {
            setError(`File size exceeds the ${maxSizeMB}MB limit.`);
            return false;
        }

        // Check extension
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        if (accept.indexOf(`.${fileExt}`) === -1) {
            setError(`Invalid file type. Only ${accept} files are allowed.`);
            return false;
        }

        return true;
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (validateFile(file)) {
                setSelectedFile(file);
                onFileSelect(file);
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (validateFile(file)) {
                setSelectedFile(file);
                onFileSelect(file);
            }
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
        onFileSelect(null);
        setError(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <div className={cn('w-full', className)}>
            {!selectedFile ? (
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    className={cn(
                        'flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-white p-6 transition-all duration-300 dark:bg-card',
                        dragActive
                            ? 'border-primary bg-accent/40'
                            : 'border-border hover:border-primary/50 hover:bg-accent/20'
                    )}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept={accept}
                        onChange={handleChange}
                        className="hidden"
                    />
                    <UploadCloud className="mb-3 h-11 w-11 text-primary/70" />
                    <p className="text-sm font-medium text-foreground text-center">
                        Drag and drop your file here, or <span className="text-primary">browse</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 text-center">
                        Supports CSV files containing phone numbers (up to {maxSizeMB}MB)
                    </p>
                </div>
            ) : (
                <div className="flex items-center justify-between rounded-lg border border-border/70 bg-card p-4 shadow-sm">
                    <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="shrink-0 rounded-lg bg-accent p-2 text-primary">
                            <FileSpreadsheet className="h-6 w-6" />
                        </div>
                        <div className="truncate text-left">
                            <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {(selectedFile.size / 1024).toFixed(1)} KB
                            </p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={removeFile}
                        className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
            {error && <p className="text-xs font-medium text-rose-600 dark:text-rose-400 mt-2 text-left">{error}</p>}
        </div>
    );
}
