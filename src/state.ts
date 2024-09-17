import { atom } from "jotai";

export type AppState = "loading" | "initial" | "ready";

export const appStateAtom = atom<AppState>("loading");
