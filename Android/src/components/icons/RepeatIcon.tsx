import React from 'react';
import Svg, {Path} from 'react-native-svg';

interface RepeatIconProps {
  size?: number;
  color?: string;
}

export const RepeatIcon: React.FC<RepeatIconProps> = ({
  size = 24,
  color = '#000',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 1L21 5L17 9M3 11V9C3 7.93913 3.42143 6.92172 4.17157 6.17157C4.92172 5.42143 5.93913 5 7 5H21M7 23L3 19L7 15M21 13V15C21 16.0609 20.5786 17.0783 19.8284 17.8284C19.0783 18.5786 18.0609 19 17 19H3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};
