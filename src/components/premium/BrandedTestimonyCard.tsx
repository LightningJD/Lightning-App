import React from 'react';
import type { TestimonyCardTemplate } from '../../types/premium';

interface BrandedTestimonyCardProps {
  nightMode: boolean;
  template: TestimonyCardTemplate;
  accentPrimary: string;
  accentSecondary: string;
  logoUrl?: string;
  churchName: string;
  testimony: {
    title: string;
    excerpt: string;
    author: string;
    avatar?: string;
  };
}

const BrandedTestimonyCard: React.FC<BrandedTestimonyCardProps> = ({
  nightMode,
  template,
  accentPrimary,
  accentSecondary,
  logoUrl,
  churchName,
  testimony,
}) => {
  const nm = nightMode;

  // Template styles
  const getTemplateStyles = (): {
    card: React.CSSProperties;
    header: React.CSSProperties;
    body: React.CSSProperties;
  } => {
    switch (template) {
      case 'classic':
        return {
          card: {
            background: nm ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
            border: `2px solid ${accentPrimary}33`,
            borderRadius: '16px',
          },
          header: {
            background: `linear-gradient(135deg, ${accentPrimary}15, ${accentSecondary}15)`,
            borderBottom: `1px solid ${accentPrimary}22`,
          },
          body: {},
        };
      case 'modern':
        return {
          card: {
            background: `linear-gradient(135deg, ${accentPrimary}10, ${accentSecondary}10)`,
            border: `1px solid ${nm ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
            borderRadius: '20px',
            overflow: 'hidden',
          },
          header: {
            background: `linear-gradient(135deg, ${accentPrimary}, ${accentSecondary})`,
            padding: '12px 16px',
          },
          body: {
            padding: '16px',
          },
        };
      case 'minimal':
        return {
          card: {
            background: 'transparent',
            borderLeft: `3px solid ${accentPrimary}`,
            borderRadius: '0 12px 12px 0',
            padding: '0 0 0 16px',
          },
          header: {},
          body: {},
        };
      default: // 'default'
        return {
          card: {
            background: nm ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)',
            border: `1px solid ${nm ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
            borderRadius: '16px',
            backdropFilter: 'blur(20px)',
          },
          header: {},
          body: {},
        };
    }
  };

  const styles = getTemplateStyles();

  return (
    <div style={styles.card} className="overflow-hidden">
      {/* Header with church branding */}
      <div
        className={`flex items-center gap-2.5 p-3 ${template === 'modern' ? '' : ''}`}
        style={styles.header}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={churchName}
            className="w-7 h-7 rounded-full object-cover"
            style={{
              border: `1.5px solid ${template === 'modern' ? 'rgba(255,255,255,0.3)' : accentPrimary + '44'}`,
            }}
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
            style={{
              background: `linear-gradient(135deg, ${accentPrimary}, ${accentSecondary})`,
            }}
          >
            {churchName.charAt(0)}
          </div>
        )}
        <span
          className={`text-xs font-bold ${
            template === 'modern'
              ? 'text-white'
              : nm ? 'text-white/60' : 'text-black/50'
          }`}
        >
          {churchName}
        </span>
      </div>

      {/* Testimony content */}
      <div className="p-3 pt-2" style={styles.body}>
        <h4
          className={`text-sm font-bold mb-1.5 ${nm ? 'text-white' : 'text-black'}`}
          style={template !== 'default' ? { color: accentPrimary } : {}}
        >
          {testimony.title}
        </h4>
        <p className={`text-xs leading-relaxed line-clamp-3 ${nm ? 'text-white/50' : 'text-black/50'}`}>
          {testimony.excerpt}
        </p>

        {/* Author */}
        <div className="flex items-center gap-2 mt-3">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
            style={{
              background: nm ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
            }}
          >
            {testimony.avatar || testimony.author.charAt(0)}
          </div>
          <span className={`text-[10px] font-medium ${nm ? 'text-white/30' : 'text-black/30'}`}>
            {testimony.author}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BrandedTestimonyCard;
