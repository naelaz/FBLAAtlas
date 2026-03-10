import { useCallback } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";

import { useNavBarVisibility } from "../context/NavBarVisibilityContext";

type UseNavBarScrollResult = {
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onScrollBeginDrag: () => void;
  scrollEventThrottle: 16;
};

export function useNavBarScroll(): UseNavBarScrollResult {
  const { reportScrollOffset, showNavBar } = useNavBarVisibility();

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      reportScrollOffset(event.nativeEvent.contentOffset.y);
    },
    [reportScrollOffset],
  );

  const onScrollBeginDrag = useCallback(() => {
    showNavBar();
  }, [showNavBar]);

  return {
    onScroll,
    onScrollBeginDrag,
    scrollEventThrottle: 16,
  };
}

