import type { ReactNode } from "react";

export interface TableColumn<T> {
  header: string;
  render: (row: T, index: number) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Array<TableColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  rowClassName?: (row: T, index: number) => string | undefined;
}

export function Table<T>({ columns, rows, rowKey, rowClassName }: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
            {columns.map((column) => (
              <th key={column.header} className={`px-5 py-3 font-semibold ${column.className ?? ""}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={rowKey(row)}
              className={`border-b border-gray-50 last:border-0 ${rowClassName?.(row, index) ?? ""}`}
            >
              {columns.map((column) => (
                <td key={column.header} className={`px-5 py-4 ${column.className ?? ""}`}>
                  {column.render(row, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
