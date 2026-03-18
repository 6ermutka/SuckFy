import React from 'react';
import Svg, {Path} from 'react-native-svg';

interface ShuffleIconProps {
  size?: number;
  color?: string;
}

export const ShuffleIcon: React.FC<ShuffleIconProps> = ({
  size = 24,
  color = '#000',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};
