import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import TestimonyCard from '../components/TestimonyCard';
import { getTestimonyById, getChurchById } from '../lib/database';
import type { BadgeColor } from '../config/badgeConfig';

const VALID_BADGE_COLORS: BadgeColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'];

const PublicTestimonyPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [testimony, setTestimony] = useState<any>(null);
  const [churchName, setChurchName] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const load = async () => {
      const data = await getTestimonyById(id);
      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setTestimony(data);

      const churchId = data.users?.church_id;
      if (churchId) {
        try {
          const church = await getChurchById(churchId);
          if (church?.name) setChurchName(church.name);
        } catch {
          // church lookup is optional — don't fail the page
        }
      }

      setLoading(false);
    };

    load().catch(() => {
      setNotFound(true);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !testimony) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-xl font-semibold text-slate-700">Testimony not found</p>
        <p className="text-slate-500 text-sm">This link may have expired or been removed.</p>
        <Link
          to="/sign-up"
          className="mt-2 px-6 py-3 bg-blue-500 text-white rounded-full font-semibold text-sm hover:bg-blue-600 transition-colors"
        >
          Join Lightning
        </Link>
      </div>
    );
  }

  const badgeColor: BadgeColor = VALID_BADGE_COLORS.includes(testimony.badge_color)
    ? testimony.badge_color
    : 'blue';

  const authorName =
    testimony.users?.display_name ||
    testimony.users?.username ||
    'Anonymous';

  const pullQuote = testimony.pull_quote || testimony.content || '';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-8 p-6">
      <TestimonyCard
        badgeColor={badgeColor}
        pullQuote={pullQuote}
        authorName={authorName}
        churchName={churchName}
        testimonyId={testimony.id}
      />

      <Link
        to="/sign-up"
        className="px-8 py-3 bg-blue-500 text-white rounded-full font-semibold text-base hover:bg-blue-600 transition-colors shadow-md"
      >
        Join Lightning
      </Link>
    </div>
  );
};

export default PublicTestimonyPage;
