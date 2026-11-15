import type { ReactNode } from "react";

interface TableProps {
    headings: string[];
    rows: ReactNode[][];
}

export const Table: React.FC<TableProps> = ({ headings, rows }) => (
    <div className="rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-base">
            <thead className="bg-gray-50 text-left text-sm text-gray-500">
                <tr>
                    {headings.map((heading) => (
                        <th key={heading} className="px-4 py-2 font-medium">{heading}</th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {rows.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                        {row.map((cell, cellIdx) => (
                            <td key={cellIdx} className="px-4 py-3">{cell}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);
