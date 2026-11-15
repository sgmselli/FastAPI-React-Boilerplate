import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
    code: string;
    label?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, label = "terminal" }) => {

    const [copied, setCopied] = useState(false);
    const lines = code.trim().split("\n");

    useEffect(() => {
        if (!copied) return;
        const timeout = setTimeout(() => setCopied(false), 2000);
        return () => clearTimeout(timeout);
    }, [copied]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code.trim());
        setCopied(true);
    };

    return (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-4 py-2 bg-gray-50 border-b border-gray-200">
                <span className="min-w-0 truncate text-sm text-gray-500">{label}</span>
                <button
                    onClick={handleCopy}
                    aria-label={copied ? "Copied" : "Copy code"}
                    className="flex-shrink-0 p-1.5 rounded-md text-gray-500 cursor-pointer hover:bg-gray-200/70 hover:text-gray-900 transition-colors"
                >
                    {copied ? <Check className="h-4 w-4 fastapi-color" /> : <Copy className="h-4 w-4" />}
                </button>
            </div>
            <pre className="px-4 py-3 overflow-x-auto text-sm leading-relaxed font-mono">
                {lines.map((line, idx) => (
                    <div key={idx} className="flex gap-4">
                        <span aria-hidden="true" className="w-4 flex-shrink-0 text-right text-gray-400 select-none">{idx + 1}</span>
                        <code className="text-gray-900">{line}</code>
                    </div>
                ))}
            </pre>
        </div>
    );
};
