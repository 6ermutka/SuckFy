import React from 'react';
import Svg, {Circle, Path} from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export const SearchIcon: React.FC<IconProps> = ({size = 24, color = '#ffffff'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle
      cx="11"
      cy="11"
      r="8"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="m21 21-4.35-4.35"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
