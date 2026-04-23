import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import TestimonyCard from '../components/TestimonyCard';
import { isValidBadgeColor } from '../config/badgeConfig';
import type { BadgeColor } from '../config/badgeConfig';

interface TestimonyPayload {
  id: string;
  pull_quote: string;
  badge_color: string;
  badge_door?: number;
  author_name: string;
  church_name?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PublicTestimonyPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [testimony, setTestimony] = useState<TestimonyPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id || !UUID_RE.test(id)) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    fetch(`/api/testimony?id=${encodeURIComponent(id)}`)
      .then((r) => {
        if (!r.ok) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        return r.json();
      })
      .then((data: TestimonyPayload | undefined) => {
        if (data) setTestimony(data);
        else setNotFound(true);
        setLoading(false);
      })
      .catch(() => {
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
        <div
          style={{
            width: 32,
            height: 32,
            border: '2px solid #3b82f6',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <p style={{ fontSize: 48, margin: 0 }}>⚡</p>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
          Testimony not found
        </h1>
        <p style={{ color: '#94a3b8', margin: 0, textAlign: 'center', fontSize: 14 }}>
          This link may have expired or been removed.
        </p>
        <a
          href="/sign-up"
          style={{
            marginTop: 8,
            display: 'inline-block',
            background: 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)',
            color: 'white',
            padding: '12px 28px',
            borderRadius: 50,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: 'none',
          }}
        >
          Join Lightning ⚡
        </a>
      </div>
    );
  }

  const badgeColor: BadgeColor = isValidBadgeColor(testimony.badge_color)
    ? testimony.badge_color
    : 'blue';

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
        pullQuote={testimony.pull_quote}
        authorName={testimony.author_name}
        churchName={testimony.church_name}
        testimonyId={testimony.id}
      />

      <a
        href="/sign-up"
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
