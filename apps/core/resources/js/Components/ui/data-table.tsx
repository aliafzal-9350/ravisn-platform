import * as React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
    header: string;
    accessorKey?: keyof T | string;
    cell?: (row: T) => React.ReactNode;
    className?: string;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    searchPlaceholder?: string;
    searchKey?: keyof T | string;
    pagination?: {
        currentPage: number;
        lastPage: number;
        total: number;
        onPageChange: (page: number) => void;
    };
    onSearchChange?: (term: string) => void;
    className?: string;
    emptyMessage?: string;
}

export function DataTable<T>({
    columns,
    data,
    searchPlaceholder = 'Search...',
    searchKey,
    pagination,
    onSearchChange,
    className,
    emptyMessage = 'No results found.',
}: DataTableProps<T>) {
    const [searchTerm, setSearchTerm] = React.useState('');

    // Local filter if not backend-paginated
    const filteredData = React.useMemo(() => {
        if (onSearchChange || !searchKey || !searchTerm) return data;

        return data.filter((item: any) => {
            const val = item[searchKey];
            if (val === undefined || val === null) return false;
            return String(val).toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [data, searchTerm, searchKey, onSearchChange]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchTerm(val);
        if (onSearchChange) {
            onSearchChange(val);
        }
    };

    return (
        <div className={cn('space-y-4', className)}>
            {((searchKey && !onSearchChange) || onSearchChange) && (
                <div className="relative flex max-w-sm items-center">
                    <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={searchPlaceholder}
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="h-11 rounded-full border-transparent bg-white pl-10 shadow-sm dark:bg-card"
                    />
                </div>
            )}

            <div className="overflow-hidden rounded-lg border border-transparent bg-card shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
                <Table>
                    <TableHeader className="bg-muted/60">
                        <TableRow>
                            {columns.map((column, idx) => (
                                <TableHead
                                    key={idx}
                                    className={cn('text-xs font-semibold uppercase tracking-normal text-muted-foreground', column.className)}
                                >
                                    {column.header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length > 0 ? (
                            filteredData.map((row, rowIdx) => (
                                <TableRow
                                    key={rowIdx}
                                    className="transition-colors hover:bg-accent/35 data-[state=selected]:bg-muted"
                                >
                                    {columns.map((column, colIdx) => {
                                        const cellContent = column.cell
                                            ? column.cell(row)
                                            : column.accessorKey
                                            ? (row as any)[column.accessorKey]
                                            : null;

                                        return (
                                            <TableCell key={colIdx} className={cn('py-3.5', column.className)}>
                                                {cellContent}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-muted-foreground">
                                    {emptyMessage}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {pagination && pagination.lastPage > 1 && (
                <div className="flex items-center justify-between py-2">
                    <p className="text-xs text-muted-foreground">
                        Total of <span className="font-semibold">{pagination.total}</span> items
                    </p>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.currentPage === 1}
                            onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                            className="h-8 px-2"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="sr-only">Previous Page</span>
                        </Button>
                        <span className="text-xs font-medium">
                            Page {pagination.currentPage} of {pagination.lastPage}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.currentPage === pagination.lastPage}
                            onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                            className="h-8 px-2"
                        >
                            <ChevronRight className="h-4 w-4" />
                            <span className="sr-only">Next Page</span>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
