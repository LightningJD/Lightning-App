import React from "react";
import {
  AlertTriangle,
  X,
  TrendingDown,
  Shield,
  Sparkles,
  BarChart3,
} from "lucide-react";

interface DowngradeConfirmDialogProps {
  nightMode: boolean;
  serverName: string;
  accessUntil: string;
  stats?: {
    testimonies?: number;
    members?: number;
    daysActive?: number;
  };
  onConfirm: () => void;
  onCancel: () => void;
}

const DowngradeConfirmDialog: React.FC<DowngradeConfirmDialogProps> = ({
  nightMode,
  serverName,
  accessUntil,
  stats,
  onConfirm,
  onCancel,
}) => {
  const nm = nightMode;

  const FEATURES_LOST = [
    { icon: Sparkles, label: "Custom banner & animated icon" },
    { icon: Shield, label: "Verified church badge" },
    { icon: BarChart3, label: "Lightning insights & advanced analytics" },
    { icon: TrendingDown, label: "Custom branding & accent colors" },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        role="presentation"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: nm ? "rgba(20,20,30,0.95)" : "rgba(255,255,255,0.95)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          border: `1px solid ${nm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        {/* Close */}
        <button
          onClick={onCancel}
          className={`absolute top-3 right-3 p-1.5 rounded-lg transition-all hover:scale-110 ${
            nm
              ? "hover:bg-white/10 text-white/30"
              : "hover:bg-black/5 text-black/30"
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div
          className="px-6 pt-6 pb-4 text-center"
          style={{
            background: nm ? "rgba(239,68,68,0.06)" : "rgba(239,68,68,0.04)",
          }}
        >
          <div
            className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <h3
            className={`text-lg font-bold ${nm ? "text-white" : "text-black"}`}
          >
            Cancel Premium?
          </h3>
          <p
            className={`text-sm mt-1 ${nm ? "text-white/50" : "text-black/50"}`}
          >
            {serverName} will lose premium features
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Stats highlight */}
          {stats && (
            <div
              className="p-3 rounded-xl text-center"
              style={{
                background: nm
                  ? "rgba(59,130,246,0.08)"
                  : "rgba(59,130,246,0.05)",
                border: `1px solid ${nm ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)"}`,
              }}
            >
              <p
                className={`text-xs font-medium ${nm ? "text-blue-300" : "text-blue-700"}`}
              >
                Your community has achieved
              </p>
              <div className="flex justify-center gap-4 mt-2">
                {stats.testimonies !== undefined && (
                  <div>
                    <p
                      className={`text-lg font-bold ${nm ? "text-white" : "text-black"}`}
                    >
                      {stats.testimonies}
                    </p>
                    <p
                      className={`text-[10px] ${nm ? "text-white/30" : "text-black/30"}`}
                    >
                      testimonies
                    </p>
                  </div>
                )}
                {stats.members !== undefined && (
                  <div>
                    <p
                      className={`text-lg font-bold ${nm ? "text-white" : "text-black"}`}
                    >
                      {stats.members}
                    </p>
                    <p
                      className={`text-[10px] ${nm ? "text-white/30" : "text-black/30"}`}
                    >
                      members
                    </p>
                  </div>
                )}
                {stats.daysActive !== undefined && (
                  <div>
                    <p
                      className={`text-lg font-bold ${nm ? "text-white" : "text-black"}`}
                    >
                      {stats.daysActive}
                    </p>
                    <p
                      className={`text-[10px] ${nm ? "text-white/30" : "text-black/30"}`}
                    >
                      days active
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* What they'll lose */}
          <div>
            <p
              className={`text-xs font-semibold mb-2 ${nm ? "text-white/60" : "text-black/60"}`}
            >
              You'll lose access to:
            </p>
            <div className="space-y-2">
              {FEATURES_LOST.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <f.icon
                    className={`w-3.5 h-3.5 ${nm ? "text-red-400/60" : "text-red-500/60"}`}
                  />
                  <span
                    className={`text-xs ${nm ? "text-white/50" : "text-black/50"}`}
                  >
                    {f.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Access until */}
          <div
            className={`p-2.5 rounded-lg text-center ${nm ? "bg-white/5" : "bg-black/3"}`}
          >
            <p className={`text-xs ${nm ? "text-white/40" : "text-black/40"}`}>
              Premium stays active through{" "}
              <span className="font-semibold">{accessUntil}</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-2">
          <button
            onClick={onCancel}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-95 ${
              nm
                ? "bg-white/10 text-white hover:bg-white/15"
                : "bg-black/5 text-black hover:bg-black/10"
            }`}
          >
            Keep Premium
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-red-400 transition-all hover:scale-[1.02] active:scale-95"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DowngradeConfirmDialog;
