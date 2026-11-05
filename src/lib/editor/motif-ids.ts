/** Topic ids, kept apart from motifs.ts so the document schema can import them without the drawings. */
export const MOTIF_IDS = ["eco", "tecnologia", "spazio", "mare", "scienza", "storia", "arte", "musica", "business", "scuola", "sport", "cibo", "viaggi", "salute"] as const;
export type MotifId = (typeof MOTIF_IDS)[number];
export const isMotifId = (v: unknown): v is MotifId => MOTIF_IDS.includes(v as MotifId);
