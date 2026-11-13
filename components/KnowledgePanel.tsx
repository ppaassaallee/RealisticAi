"use client";
import { useState } from "react";
import { BookOpen, ChevronDown, Search, ArrowUpRight } from "lucide-react";
import { publicKnowledge } from "@/lib/knowledge";
export default function KnowledgePanel({ spanish }: { spanish: boolean }) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  const lang = spanish ? "es" : "en";
  const visible = publicKnowledge.filter((e) =>
    (e.title[lang] + " " + e.answer[lang])
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <section className="knowledge-panel">
      <button
        className="knowledge-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <BookOpen size={18} />
        <span>
          <strong>
            {spanish ? "Más que una bienvenida" : "More than a welcome"}
          </strong>
          <small>
            {spanish
              ? "Seguros, tu visita, privacidad y más"
              : "Insurance, your visit, privacy & more"}
          </small>
        </span>
        <ChevronDown size={17} className={open ? "rotated" : ""} />
      </button>
      {open && (
        <div className="knowledge-content">
          <label className="knowledge-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={spanish ? "Busca una pregunta…" : "Find a question…"}
              aria-label={spanish ? "Buscar conocimiento" : "Search knowledge"}
            />
          </label>
          <div className="knowledge-answers">
            {visible.map((e) => (
              <details key={e.id}>
                <summary>
                  {e.title[lang]}
                  <ArrowUpRight size={14} />
                </summary>
                <p>{e.answer[lang]}</p>
                <small>
                  {e.id} ·{" "}
                  {spanish
                    ? "Información general de la demo"
                    : "General demo information"}
                </small>
              </details>
            ))}
            {!visible.length && (
              <p>
                {spanish
                  ? "No hay una respuesta verificada. Pide ayuda a recepción."
                  : "No verified answer found. Ask reception for help."}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
