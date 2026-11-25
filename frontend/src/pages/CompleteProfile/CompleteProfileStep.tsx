import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";

import usePageTitle from "../../hooks/usePageTitle";
import { ContentNotFound } from "../../components/ContentNotFound";
import { completeProfilePath, completeProfileSteps, firstCompleteProfilePath, type CompleteProfileState } from "./steps";

const DEFAULT_RETURN_TO = "/docs/getting-started";

// Keeps the state from AuthCallback when arriving at the bare /complete-profile
export const CompleteProfileRedirect: React.FC = () => {
    const { state } = useLocation();
    return <Navigate to={firstCompleteProfilePath} replace state={state} />;
};

export const CompleteProfileStep: React.FC = () => {

    const { slug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const index = completeProfileSteps.findIndex((step) => step.slug === slug);
    const step = completeProfileSteps[index];

    usePageTitle(step?.title);

    if (!step) {
        return <ContentNotFound />;
    }

    const state = location.state as CompleteProfileState | null;
    const returnTo = state?.returnTo ?? DEFAULT_RETURN_TO;
    const next = completeProfileSteps[index + 1];
    const Content = step.content;

    const handleContinue = () => {
        if (next) {
            navigate(completeProfilePath(next.slug), { state });
        } else {
            navigate(returnTo, { replace: true });
        }
    };

    return (
        <section className="flex flex-col items-center justify-center mt-6">
            <div className="w-full max-w-lg">
                <div className="card rounded-lg">
                    <div className="card-body space-y-6 py-0 md:pt-8 md:pb-12 px-0 text-color">
                        <div className="flex flex-col items-start gap-1">
                            {completeProfileSteps.length > 1 && (
                                <p className="text-sm font-medium text-gray-500">
                                    Step {index + 1} of {completeProfileSteps.length}
                                </p>
                            )}
                            <h1 className="text-4xl font-semibold primary-color">{step.title}</h1>
                            <p className="text-lg mt-2 text-gray-500">{step.subtitle}</p>
                        </div>

                        <Content key={step.slug} actionLabel={next ? "Next" : "Complete"} onContinue={handleContinue} />
                    </div>
                </div>
            </div>
        </section>
    );
};
