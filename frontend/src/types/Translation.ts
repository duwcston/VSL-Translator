export interface SupportedSign {
    label: string;  // detector class name, e.g. "Thank you"
    gloss: string;  // what the sentence model sees, e.g. "THANK X-YOU"
}

export interface SupportedSignsResponse {
    signs: SupportedSign[];
    backend: string;  // "seq2seq" or "none" (no sentence model loaded)
}

export interface TranslationResponse {
    labels: string[];
    gloss: string;
    sentence: string | null;
    backend: string;
    latency_ms: number;
}
