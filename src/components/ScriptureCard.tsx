/**
 * Scripture Card Component
 * Displays auto-expanded verse references in chat with translation switching,
 * discussion questions, and share-to-chat functionality.
 */

import React, { useState, useEffect } from "react";
import {
  Book,
  MessageSquare,
  Share2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  ScriptureReference,
  BibleTranslation,
  TRANSLATIONS,
  fetchVerseText,
  getDiscussionQuestions,
  formatVerseCard,
} from "../lib/scripture";

interface ScriptureCardProps {
  reference: ScriptureReference;
  nightMode: boolean;
  onShareToChat?: (text: string) => void;
  compact?: boolean;
}

const ScriptureCard: React.FC<ScriptureCardProps> = ({
  reference,
  nightMode,
  onShareToChat,
  compact = false,
}) => {
  const [verseText, setVerseText] = useState<string>("");
  const [translation, setTranslation] = useState<BibleTranslation>("NIV");
  const [loading, setLoading] = useState(true);
  const [showQuestions, setShowQuestions] = useState(false);
  const [showTranslations, setShowTranslations] = useState(false);

  useEffect(() => {
    loadVerse();
  }, [reference, translation]);

  const loadVerse = async () => {
    setLoading(true);
    const text = await fetchVerseText(reference, translation);
    setVerseText(text);
    setLoading(false);
  };

  const handleShare = () => {
    if (onShareToChat && verseText) {
      const card = formatVerseCard(reference, verseText, translation);
      onShareToChat(card);
    }
  };

  const questions = getDiscussionQuestions(reference);

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
          nightMode
            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25"
            : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
        }`}
        title={`${reference.fullReference} - Click to expand`}
      >
        <Book className="w-3 h-3" />
        {reference.fullReference}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border overflow-hidden mt-1.5 max-w-[320px] ${
        nightMode ? "bg-white/5 border-amber-500/30" : "border-amber-200"
      }`}
      style={
        nightMode
          ? {}
          : {
              background:
                "linear-gradient(135deg, rgba(255, 251, 235, 0.9) 0%, rgba(254, 243, 199, 0.7) 100%)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }
      }
    >
      {/* Header */}
      <div
        className={`px-3 py-2 flex items-center justify-between border-b ${
          nightMode ? "border-amber-500/20" : "border-amber-200/50"
        }`}
      >
        <div className="flex items-center gap-1.5">
          <Book
            className={`w-3.5 h-3.5 ${nightMode ? "text-amber-400" : "text-amber-600"}`}
          />
          <span
            className={`text-xs font-bold ${nightMode ? "text-amber-300" : "text-amber-800"}`}
          >
            {reference.fullReference}
          </span>
        </div>

        {/* Translation toggle */}
        <div className="relative">
          <button
            onClick={() => setShowTranslations(!showTranslations)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 ${
              nightMode
                ? "bg-amber-500/20 text-amber-300"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {translation}
            <ChevronDown className="w-2.5 h-2.5" />
          </button>

          {showTranslations && (
            <div
              className={`absolute right-0 top-full mt-1 rounded-lg border overflow-hidden z-50 min-w-[120px] ${
                nightMode
                  ? "bg-[#1a1a1a] border-white/10"
                  : "bg-white border-amber-200"
              }`}
              style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}
            >
              {TRANSLATIONS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTranslation(t.id);
                    setShowTranslations(false);
                  }}
                  className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between ${
                    translation === t.id
                      ? nightMode
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-amber-50 text-amber-700"
                      : nightMode
                        ? "text-slate-100 hover:bg-white/5"
                        : "text-black hover:bg-amber-50"
                  }`}
                >
                  <span className="font-semibold">{t.name}</span>
                  <span
                    className={`text-[9px] ${nightMode ? "text-slate-400" : "text-black/40"}`}
                  >
                    {t.fullName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Verse text */}
      <div className="px-3 py-2.5">
        {loading ? (
          <div
            className={`text-xs italic ${nightMode ? "text-slate-400" : "text-amber-600/60"}`}
          >
            Loading verse...
          </div>
        ) : (
          <p
            className={`text-sm leading-relaxed italic ${nightMode ? "text-slate-200" : "text-amber-900"}`}
          >
            &ldquo;{verseText}&rdquo;
          </p>
        )}
      </div>

      {/* Actions */}
      <div
        className={`px-3 py-2 flex items-center gap-2 border-t ${
          nightMode ? "border-amber-500/20" : "border-amber-200/50"
        }`}
      >
        <button
          onClick={() => setShowQuestions(!showQuestions)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
            showQuestions
              ? nightMode
                ? "bg-amber-500/20 text-amber-300"
                : "bg-amber-100 text-amber-700"
              : nightMode
                ? "text-slate-300 hover:bg-white/5"
                : "text-amber-600 hover:bg-amber-50"
          }`}
        >
          <MessageSquare className="w-3 h-3" />
          Questions
          {showQuestions ? (
            <ChevronUp className="w-2.5 h-2.5" />
          ) : (
            <ChevronDown className="w-2.5 h-2.5" />
          )}
        </button>

        {onShareToChat && (
          <button
            onClick={handleShare}
            disabled={loading || !verseText}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all disabled:opacity-50 ${
              nightMode
                ? "text-slate-300 hover:bg-white/5"
                : "text-amber-600 hover:bg-amber-50"
            }`}
          >
            <Share2 className="w-3 h-3" />
            Share
          </button>
        )}
      </div>

      {/* Discussion questions */}
      {showQuestions && (
        <div
          className={`px-3 py-2.5 border-t space-y-1.5 ${
            nightMode ? "border-amber-500/20" : "border-amber-200/50"
          }`}
        >
          <p
            className={`text-[10px] font-bold uppercase tracking-wider ${
              nightMode ? "text-amber-400" : "text-amber-700"
            }`}
          >
            Discussion Questions
          </p>
          {questions.slice(0, 4).map((q, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className={`text-[10px] font-bold mt-0.5 text-amber-500`}>
                {i + 1}.
              </span>
              <p
                className={`text-xs leading-relaxed ${nightMode ? "text-slate-300" : "text-amber-800"}`}
              >
                {q}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScriptureCard;
