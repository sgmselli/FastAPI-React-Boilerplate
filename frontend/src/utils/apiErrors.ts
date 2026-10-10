import axios from "axios";

type ApiValidationError = {
    loc: (string | number)[];
    msg: string;
};

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

export interface ParsedApiError<Field extends string> {
    message: string | null;
    fieldErrors: FieldErrors<Field>;
}

export const parseApiError = <Field extends string>(err: unknown, fallback: string): ParsedApiError<Field> => {
    /**
     * Turn a failed request into something a form can show.
     *
     * FastAPI sends `detail` as a string for errors raised by the app, and as a
     * list for request validation errors - each keyed by `loc`, e.g. ["body", "name"].
     * A string becomes `message`; a list becomes `fieldErrors` with `message` left
     * null, so each form decides where field messages go. Anything else gets `fallback`.
     */
    const detail = axios.isAxiosError(err) ? err.response?.data?.detail : undefined;

    if (typeof detail === "string") {
        return { message: detail, fieldErrors: {} };
    }

    if (Array.isArray(detail)) {
        const fieldErrors: FieldErrors<Field> = {};

        (detail as ApiValidationError[]).forEach((e) => {
            const field = e.loc[1] as Field;
            fieldErrors[field] = e.msg;
        });

        return { message: null, fieldErrors };
    }

    return { message: fallback, fieldErrors: {} };
}
