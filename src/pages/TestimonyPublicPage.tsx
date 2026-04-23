import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getTestimonyById } from '../lib/database';
import TestimonyCard from '../components/TestimonyCard';
import { isValidBadgeColor } from '../config/badgeConfig';
import type { BadgeColor } from '../config/badgeConfig';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TestimonyPublicPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [testimony, setTestimony] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id || !UUID_RE.test(id)) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    getTestimonyById(id).then((data) => {
      if (!data) {
        setNotFound(true);
      } else {
        setTestimony(data);
      }
      setLoading(false);
    });
  }, [id]);

  const badgeColor: BadgeColor = isValidBadgeColor(testimony?.badge_color)
    ? (testimony.badge_color as BadgeColor)
    : 'blue';

  const authorName: string =
    testimony?.users?.display_name ||
    testimony?.users?.username ||
    'Anonymous';

  const pullQuote: string =
    testimony?.pull_quote?.trim() ||
    (testimony?.content ? testimony.content.slice(0, 200).trim() + (testimony.content.length > 200 ? '…' : '') : '');

  const title: string = testimony?.title || 'A Testimony';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-center">
        <p className="text-4xl mb-4">⚡</p>
        <h1 className="text-white text-2xl font-bold mb-2">Testimony not found</h1>
        <p className="text-slate-400 text-sm mb-8">This link may have expired or the testimony was removed.</p>
        <a
          href="/sign-up"
          className="px-6 py-3 rounded-full text-white text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)' }}
        >
          Join Lightning
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center px-4 py-12">
      {/* Header */}
      <div className="flex items-center gap-2 mb-10">
        <span className="text-xl">⚡</span>
        <span className="text-white font-bold tracking-widest text-sm uppercase">Lightning</span>
      </div>

      {/* TestimonyCard */}
      <div className="mb-8">
        <TestimonyCard
          badgeColor={badgeColor}
          pullQuote={pullQuote}
          authorName={authorName}
          testimonyId={id!}
        />
      </div>

      {/* Title + author */}
      <h1 className="text-white text-xl font-bold text-center mb-1 max-w-xs">{title}</h1>
      <p className="text-slate-400 text-sm mb-10 text-center">by {authorName}</p>

      {/* CTA */}
      <a
        href="/sign-up"
        className="px-8 py-3 rounded-full text-white font-semibold text-sm transition-transform hover:scale-105"
        style={{ background: 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)' }}
      >
        Join Lightning — Share Your Story
      </a>
      <p className="text-slate-500 text-xs mt-3 text-center">
        AI-powered testimonies. Faith community. Free to join.
      </p>
    </div>
  );
};

export default TestimonyPublicPage;
