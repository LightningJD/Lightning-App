import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import TestimonyCard from '../components/TestimonyCard';
import { getTestimonyById, getChurchById } from '../lib/database';
import { isValidBadgeColor } from '../config/badgeConfig';
import type { BadgeColor } from '../config/badgeConfig';

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
        const church = await getChurchById(churchId);
        if (church) setChurchName((church as any).name);
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
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #0f172a, #1e3a5f)',
        }}
      >
        <p style={{ color: '#94a3b8', fontFamily: 'system-ui, sans-serif', fontSize: 15 }}>
          Loading…
        </p>
      </div>
    );
  }

  if (notFound || !testimony) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #0f172a, #1e3a5f)',
          padding: '24px',
          gap: 12,
        }}
      >
        <p style={{ fontSize: 48, margin: 0 }}>⚡</p>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#f1f5f9',
            margin: 0,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Testimony not found
        </h1>
        <p style={{ color: '#94a3b8', fontFamily: 'system-ui, sans-serif', margin: 0, textAlign: 'center' }}>
          This testimony may have been removed or the link is invalid.
        </p>
      </div>
    );
  }

  const badgeColor: BadgeColor = isValidBadgeColor(testimony.badge_color)
    ? testimony.badge_color
    : 'blue';

  const pullQuote =
    testimony.pull_quote ||
    (testimony.content ? testimony.content.substring(0, 200) : '') ||
    '';

  const authorName =
    testimony.users?.display_name || testimony.users?.username || 'Anonymous';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0f172a, #1e3a5f)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 16px',
        gap: 32,
      }}
    >
      <TestimonyCard
        badgeColor={badgeColor}
        pullQuote={pullQuote}
        authorName={authorName}
        churchName={churchName}
        testimonyId={testimony.id}
      />

      <a
        href="https://lightning-dni.pages.dev"
        style={{
          display: 'inline-block',
          background: 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)',
          color: 'white',
          padding: '14px 32px',
          borderRadius: 50,
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 600,
          fontSize: 15,
          textDecoration: 'none',
          letterSpacing: 0.3,
          boxShadow: '0 8px 24px rgba(59,130,246,0.4)',
        }}
      >
        Join Lightning ⚡
      </a>
    </div>
  );
};

export default PublicTestimonyPage;
