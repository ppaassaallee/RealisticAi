"use client";
import { createContext, useContext, useEffect, useState } from "react";
type Language = "en" | "es";
const LanguageContext = createContext({ language: "en" as Language, setLanguage: (_: Language) => {} });
export function SiteLanguage({ children }: { children: React.ReactNode }) {
  const [language, update] = useState<Language>("en");
  useEffect(() => {
    try { if (localStorage.getItem("onesource-site-language") === "es") update("es"); } catch {}
  }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  function setLanguage(value: Language) {
    update(value);
    try { localStorage.setItem("onesource-site-language", value); } catch {}
  }
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}
export function useSiteLanguage() {
  const { language, setLanguage } = useContext(LanguageContext);
  return { language, setLanguage, t: (en: string, es: string) => language === "en" ? en : es };
}
