import { Link, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

import usePageTitle from "../../hooks/usePageTitle";
import { ContentNotFound } from "../../components/ContentNotFound";
import { docsPath, docsSteps } from "./steps";

export const DocsStep: React.FC = () => {

    const { slug } = useParams();
    const index = docsSteps.findIndex((step) => step.slug === slug);
    const step = docsSteps[index];

    usePageTitle(step?.title);

    if (!step) {
        return <ContentNotFound />;
    }

    const previous = docsSteps[index - 1];
    const next = docsSteps[index + 1];
    const Content = step.content;

    return (
        <article className="flex flex-col text-color">
            <header>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{step.title}</h1>
                <p className="mt-3 text-lg text-gray-600">{step.subtitle}</p>
            </header>

            <div className="mt-10 flex flex-col gap-12 text-lg leading-relaxed text-gray-800">
                <Content />
            </div>

            {(previous || next) && (
                <nav aria-label="Step navigation" className="mt-16 pt-6 border-t border-gray-200 flex items-center justify-between gap-4 text-lg font-semibold">
                    {previous ? (
                        <Link to={docsPath(previous.slug)} className="flex items-center gap-1 text-color hover:underline">
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Link>
                    ) : <span />}
                    {next && (
                        <Link to={docsPath(next.slug)} className="flex items-center gap-1 text-color hover:underline">
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    )}
                </nav>
            )}
        </article>
    );
};
