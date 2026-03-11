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

import { useThemeContext } from "../../context/ThemeContext";

type FinnRobotIconProps = {
  size?: number;
  primaryColor?: string;
  secondaryColor?: string;
};

export function FinnRobotIcon({ size = 36, primaryColor, secondaryColor }: FinnRobotIconProps) {
  const { palette } = useThemeContext();
  const gradId = `finnGrad_${palette.name}`;
  const faceGradId = `finnFace_${palette.name}`;
  const primary = primaryColor ?? palette.colors.primary;
  const secondary = secondaryColor ?? palette.colors.secondary;

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={primary} />
          <Stop offset="100%" stopColor={secondary} />
        </LinearGradient>
        <LinearGradient id={faceGradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={palette.colors.surface} stopOpacity="1" />
          <Stop offset="100%" stopColor={palette.colors.elevated} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* Head body */}
      <Rect x="10" y="16" width="44" height="38" rx="14" fill={`url(#${gradId})`} />

      {/* Face screen / visor */}
      <Rect x="15" y="21" width="34" height="26" rx="10" fill={`url(#${faceGradId})`} opacity={0.96} />

      {/* Left eye — rounded square robot style */}
      <Rect x="19" y="27" rx="4" ry="4" width="10" height="10" fill={palette.colors.text} />
      <Circle cx="22" cy="30" r="2" fill={`url(#${gradId})`} />
      <Circle cx="23.5" cy="28.5" r="1" fill="#ffffff" opacity={0.7} />

      {/* Right eye — rounded square robot style */}
      <Rect x="35" y="27" rx="4" ry="4" width="10" height="10" fill={palette.colors.text} />
      <Circle cx="38" cy="30" r="2" fill={`url(#${gradId})`} />
      <Circle cx="39.5" cy="28.5" r="1" fill="#ffffff" opacity={0.7} />

      {/* Mouth — slight upward curve, not a big smile */}
      <Path
        d="M25 42 Q32 45.5 39 42"
        stroke={palette.colors.textSecondary}
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
        opacity={0.75}
      />

      {/* Antenna stem */}
      <Rect x="30" y="6" width="4" height="11" rx="2" fill={`url(#${gradId})`} opacity={0.85} />
      {/* Antenna ball */}
      <Circle cx="32" cy="6" r="4.5" fill={secondary} />
      <Circle cx="33.5" cy="4.5" r="1.4" fill="#ffffff" opacity={0.65} />

      {/* Ear bolts */}
      <Circle cx="10" cy="33" r="4" fill={`url(#${gradId})`} opacity={0.8} />
      <Circle cx="10" cy="33" r="2" fill={palette.colors.surface} opacity={0.5} />
      <Circle cx="54" cy="33" r="4" fill={`url(#${gradId})`} opacity={0.8} />
      <Circle cx="54" cy="33" r="2" fill={palette.colors.surface} opacity={0.5} />
    </Svg>
  );
}
