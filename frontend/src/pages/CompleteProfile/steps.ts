import type { ComponentType } from "react";

import { NameStep } from "./content/NameStep";

export interface CompleteProfileStepProps {
    // "Next" until the final step, then "Complete"
    actionLabel: string;
    onContinue: () => void;
}

export interface CompleteProfileStepDefinition {
    slug: string;
    title: string;
    subtitle: string;
    content: ComponentType<CompleteProfileStepProps>;
}

// Set by AuthCallback and carried between steps
export interface CompleteProfileState {
    returnTo?: string;
    suggestedFirstName?: string | null;
    suggestedLastName?: string | null;
}

// The order here is the order of the steps
export const completeProfileSteps: CompleteProfileStepDefinition[] = [
    {
        slug: "name",
        title: "What's your name?",
        subtitle: "This is how you're name will appear across the app.",
        content: NameStep,
    },
];

export const completeProfilePath = (slug: string) => `/complete-profile/${slug}`;

export const firstCompleteProfilePath = completeProfilePath(completeProfileSteps[0].slug);
