import React from "react";
import Svg, { Defs, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";

type SchoolCrestIconProps = {
  size?: number;
  initials?: string;
};

export function SchoolCrestIcon({ size = 40, initials = "FA" }: SchoolCrestIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="crestGradient" x1="4" y1="2" x2="60" y2="58">
          <Stop offset="0%" stopColor="#0EA5E9" />
          <Stop offset="100%" stopColor="#2563EB" />
        </LinearGradient>
      </Defs>
      <Path
        d="M32 4L55 12V30C55 43 46 54 32 60C18 54 9 43 9 30V12L32 4Z"
        fill="url(#crestGradient)"
      />
      <Path
        d="M32 10L49 16V30C49 40.4 42 49 32 54C22 49 15 40.4 15 30V16L32 10Z"
        fill="rgba(255,255,255,0.24)"
      />
      <SvgText
        x="32"
        y="36"
        textAnchor="middle"
        fontSize="16"
        fontWeight="700"
        fill="#FFFFFF"
      >
        {initials}
      </SvgText>
    </Svg>
  );
}

