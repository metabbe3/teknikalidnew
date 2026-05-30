import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface Column<T> {
  header: string;
  cell: (row: T, index: number) => ReactNode;
  className?: string;
}

interface AdminDataTableProps<T> {
  columns: Column<T>[];
  data: T[] | undefined;
  loading?: boolean;
  emptyMessage?: string;
  keyFn: (row: T, index: number) => string | number;
  loadingRows?: number;
}

export function AdminDataTable<T>({
  columns,
  data,
  loading,
  emptyMessage = "No data available",
  keyFn,
  loadingRows = 5,
}: AdminDataTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: loadingRows }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-blue-50/80 to-indigo-50/60 hover:from-blue-50/80 hover:to-indigo-50/60">
            {columns.map((col) => (
              <TableHead key={col.header} className={`text-xs font-semibold text-gray-600 uppercase tracking-wider ${col.className ?? ""}`}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow key={keyFn(row, i)} className={`${i % 2 === 1 ? "bg-gray-50/50" : ""} hover:bg-blue-50/30 transition-colors`}>
              {columns.map((col) => (
                <TableCell key={col.header} className={col.className}>
                  {col.cell(row, i)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
