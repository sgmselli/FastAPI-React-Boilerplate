export const formatTitle = (title: string | null | undefined) => {
    /**
     * Take in a string parameter and capitalize the first word + remove hythens and replace with space.
     */
    if (!title) return "";
    const formatted = title.replace(/-/g, " ").trim();
    return formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase();
} 