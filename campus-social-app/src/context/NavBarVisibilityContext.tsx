import React, { createContext, useContext, useMemo, useRef } from "react";
import {
  Easing,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

type NavBarVisibilityContextValue = {
  navTranslateY: SharedValue<number>;
  reportScrollOffset: (offsetY: number) => void;
  showNavBar: () => void;
  hideNavBar: () => void;
};

const NavBarVisibilityContext = createContext<NavBarVisibilityContextValue | undefined>(
  undefined,
);

export function NavBarVisibilityProvider({ children }: { children: React.ReactNode }) {
  const lastOffsetRef = useRef(0);
  const navTranslateY = useSharedValue(0);

  const reportScrollOffset = (offsetY: number) => {
    const nextOffset = Math.max(0, offsetY);
    const delta = nextOffset - lastOffsetRef.current;
    lastOffsetRef.current = nextOffset;

    if (nextOffset <= 50) {
      navTranslateY.value = withTiming(0, {
        duration: 250,
        easing: Easing.out(Easing.back(1.2)),
      });
      return;
    }

    if (delta > 10) {
      navTranslateY.value = withTiming(200, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    if (delta < 0) {
      navTranslateY.value = withTiming(0, {
        duration: 250,
        easing: Easing.out(Easing.back(1.2)),
      });
    }
  };

  const showNavBar = () => {
    navTranslateY.value = withTiming(0, {
      duration: 250,
      easing: Easing.out(Easing.back(1.2)),
    });
  };

  const hideNavBar = () => {
    navTranslateY.value = withTiming(200, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  };

  const value = useMemo(
    () => ({
      navTranslateY,
      reportScrollOffset,
      showNavBar,
      hideNavBar,
    }),
    [navTranslateY],
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
