import React from 'react';
import Svg, {Circle, Path} from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export const SettingsIcon: React.FC<IconProps> = ({size = 24, color = '#ffffff'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle
      cx="12"
      cy="12"
      r="3"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 1v6m0 6v10M3.93 3.93l4.24 4.24m8.48 8.48l4.24 4.24M1 12h6m6 0h10M3.93 20.07l4.24-4.24m8.48-8.48l4.24-4.24"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
