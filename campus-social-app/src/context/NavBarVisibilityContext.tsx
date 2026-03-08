import React, { createContext, useContext, useMemo, useRef, useState } from "react";

type NavBarVisibilityContextValue = {
  hidden: boolean;
  reportScrollOffset: (offsetY: number) => void;
  showNavBar: () => void;
  hideNavBar: () => void;
};

const NavBarVisibilityContext = createContext<NavBarVisibilityContextValue | undefined>(
  undefined,
);

export function NavBarVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const lastOffsetRef = useRef(0);

  const reportScrollOffset = (offsetY: number) => {
    const nextOffset = Math.max(0, offsetY);
    const delta = nextOffset - lastOffsetRef.current;
    lastOffsetRef.current = nextOffset;

    if (nextOffset < 36) {
      setHidden(false);
      return;
    }

    if (delta > 6) {
      setHidden(true);
    } else if (delta < -4) {
      setHidden(false);
    }
  };

  const showNavBar = () => setHidden(false);
  const hideNavBar = () => setHidden(true);

  const value = useMemo(
    () => ({
      hidden,
      reportScrollOffset,
      showNavBar,
      hideNavBar,
    }),
    [hidden],
  );

  return (
    <NavBarVisibilityContext.Provider value={value}>
      {children}
    </NavBarVisibilityContext.Provider>
  );
}

export function useNavBarVisibility(): NavBarVisibilityContextValue {
  const context = useContext(NavBarVisibilityContext);
  if (!context) {
    throw new Error("useNavBarVisibility must be used inside NavBarVisibilityProvider");
  }
  return context;
}
