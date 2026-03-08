import React from "react";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

type FinnRobotIconProps = {
  size?: number;
};

export function FinnRobotIcon({ size = 36 }: FinnRobotIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="finnGradient" x1="4" y1="4" x2="60" y2="60">
          <Stop offset="0%" stopColor="#8B5CF6" />
          <Stop offset="100%" stopColor="#2563EB" />
        </LinearGradient>
      </Defs>

      <Circle cx="32" cy="32" r="30" fill="url(#finnGradient)" />
      <Rect x="15" y="19" width="34" height="28" rx="13" fill="#F8FAFC" opacity={0.96} />
      <Ellipse cx="25" cy="31" rx="4.2" ry="5.1" fill="#1E293B" />
      <Ellipse cx="39" cy="31" rx="4.2" ry="5.1" fill="#1E293B" />
      <Path
        d="M24 39C26.1 41.4 29 42.6 32 42.6C35 42.6 37.9 41.4 40 39"
        stroke="#334155"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <Rect x="29.5" y="13" width="5" height="7" rx="2.5" fill="#E2E8F0" />
      <Circle cx="32" cy="13" r="2.2" fill="#93C5FD" />
    </Svg>
  );
}

