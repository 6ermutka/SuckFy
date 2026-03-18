import React from 'react';
import Svg, {Path, Circle} from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export const MusicIcon: React.FC<IconProps> = ({size = 24, color = '#ffffff'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 18V5l12-2v13"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="6" cy="18" r="3" stroke={color} strokeWidth={2} />
    <Circle cx="18" cy="16" r="3" stroke={color} strokeWidth={2} />
  </Svg>
);
