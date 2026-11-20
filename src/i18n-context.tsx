"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DICT, type Lang } from "./i18n";

const Ctx = createContext<Lang>("en");

export function I18n({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}
export const useLang = () => useContext(Ctx);
export const useT = () => DICT[useContext(Ctx)];
