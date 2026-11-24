export type HadithCategory = { id: number; title: string; parent: number | null; count: number };
export type HadithListItem = { id: number; title: string; cats: number[]; c: number };
export type HadithIndex = { categories: HadithCategory[]; items: HadithListItem[] };
export type HadithBody = {
  text: string;
  ar: string;
  attribution: string;
  grade: string;
  gradeAr: string;
  explanation: string;
  hints: string[];
};
export type HadithChunk = Record<string, HadithBody>;
