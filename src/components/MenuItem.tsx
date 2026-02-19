import React, { useState, useEffect } from "react";

interface DropdownOption {
  value: string;
  label: string;
}

interface MenuItemProps {
  icon: React.ComponentType<any>;
  label: string;
  subtext?: string;
  toggle?: boolean;
  defaultOn?: boolean;
  danger?: boolean;
  nightMode?: boolean;
  comingSoon?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  onToggle?: (value: boolean) => void | Promise<void>;
  isOn?: boolean;
  dropdown?: boolean;
  dropdownOptions?: (string | DropdownOption)[];
  selectedValue?: string;
  onDropdownChange?: (value: string) => void | Promise<void>;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon: Icon,
  label,
  subtext,
  toggle,
  defaultOn,
  danger,
  nightMode,
  comingSoon,
  disabled,
  onClick,
  onToggle,
  isOn: controlledIsOn,
  // New: dropdown support
  dropdown,
  dropdownOptions,
  selectedValue,
  onDropdownChange,
}) => {
  // Use controlled state if provided, otherwise use internal state
  const [internalIsOn, setInternalIsOn] = useState(defaultOn || false);
  const isOn = controlledIsOn !== undefined ? controlledIsOn : internalIsOn;

  useEffect(() => {
    if (controlledIsOn === undefined && defaultOn !== undefined) {
      setInternalIsOn(defaultOn);
    }
  }, [defaultOn, controlledIsOn]);

  const handleClick = () => {
    if (!disabled && !comingSoon && onClick && !toggle && !dropdown) {
      onClick();
    }
  };

  const handleToggle = (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    if (disabled || comingSoon) return;

    const newValue = !isOn;

    // If controlled, call onToggle
    if (onToggle) {
      onToggle(newValue);
    } else {
      // Otherwise update internal state
      setInternalIsOn(newValue);
    }
  };

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    if (disabled || comingSoon) return;

    if (onDropdownChange) {
      onDropdownChange(e.target.value);
    }
  };

  return (
    <button
      className={`w-full px-4 py-3 flex items-center justify-between transition-colors border-b last:border-b-0 ${
        disabled || comingSoon
          ? nightMode
            ? "cursor-not-allowed opacity-50"
            : "cursor-not-allowed opacity-60"
          : nightMode
            ? "hover:bg-white/5 border-white/10"
            : "hover:bg-slate-50 border-slate-100"
      }`}
      disabled={disabled || comingSoon}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        <Icon
          className={`w-5 h-5 ${danger ? "text-red-500" : nightMode ? "text-slate-100" : "text-slate-400"}`}
        />
        <div className="text-left">
          <div className="flex items-center gap-2">
            <p
              className={`text-sm font-medium ${danger ? "text-red-600" : nightMode ? "text-slate-100" : "text-slate-900"}`}
            >
              {label}
            </p>
            {comingSoon && (
              <span
                className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${nightMode ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700"}`}
              >
                SOON
              </span>
            )}
          </div>
          {subtext && (
            <p
              className={`text-xs mt-0.5 ${nightMode ? "text-slate-100" : "text-slate-500"}`}
            >
              {subtext}
            </p>
          )}
        </div>
      </div>
      {toggle && (
        <div
          role="switch"
          aria-checked={isOn}
          tabIndex={0}
          onClick={handleToggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleToggle();
            }
          }}
          className="flex-shrink-0 relative transition-colors cursor-pointer"
          style={{
            width: "36px",
            height: "20px",
            borderRadius: "10px",
            background: isOn
              ? nightMode ? "rgba(123,118,224,0.3)" : "rgba(79,172,254,0.25)"
              : nightMode ? "rgba(255,255,255,0.08)" : "rgba(150,165,225,0.15)",
          }}
        >
          <div
            className="absolute transition-all"
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              top: "2px",
              left: isOn ? "18px" : "2px",
              background: isOn
                ? nightMode ? "#7b76e0" : "#4facfe"
                : nightMode ? "#5d5877" : "#8e9ec0",
            }}
          />
        </div>
      )}
      {dropdown && dropdownOptions && (
        <select
          value={selectedValue}
          onChange={handleDropdownChange}
          onClick={(e) => e.stopPropagation()}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer flex-shrink-0 ${
            nightMode
              ? "bg-white/10 text-slate-100 border border-white/20 hover:bg-white/15"
              : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
          }`}
          disabled={disabled || comingSoon}
        >
          {dropdownOptions.map((option) => {
            const optionValue =
              typeof option === "string" ? option : option.value;
            const optionLabel =
              typeof option === "string" ? option : option.label;
            return (
              <option
                key={optionValue}
                value={optionValue}
                className={
                  nightMode
                    ? "bg-slate-800 text-slate-100"
                    : "bg-white text-slate-700"
                }
              >
                {optionLabel}
              </option>
            );
          })}
        </select>
      )}
      {!toggle && !dropdown && !subtext && (
        <svg
          className={`w-4 h-4 flex-shrink-0 ${nightMode ? "text-slate-100" : "text-slate-400"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      )}
    </button>
  );
};

export default MenuItem;
