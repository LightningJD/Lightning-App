import React from "react";
import { useSwipeable } from "react-swipeable";

interface SwipeablePageWrapperProps {
  onBack: () => void;
  children: React.ReactNode;
  /** Minimum swipe distance in px to trigger onBack (default 80) */
  threshold?: number;
}

const SwipeablePageWrapper: React.FC<SwipeablePageWrapperProps> = ({
  onBack,
  children,
  threshold = 80,
}) => {
  const handlers = useSwipeable({
    onSwipedRight: (e) => {
      if (e.absX >= threshold) {
        onBack();
      }
    },
    trackMouse: false,
    preventScrollOnSwipe: false,
    delta: 30,
  });

  return (
    <div {...handlers} className="w-full h-full">
      {children}
    </div>
  );
};

export default SwipeablePageWrapper;
