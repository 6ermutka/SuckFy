import React from 'react';
import Svg, {Circle, Path} from 'react-native-svg';

interface VinylIconProps {
  size?: number;
  color?: string;
}

const VinylIcon: React.FC<VinylIconProps> = ({size = 24, color = '#ffffff'}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Outer circle */}
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" fill="none" />
      
      {/* Grooves */}
      <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth="0.5" fill="none" opacity="0.6" />
      <Circle cx="12" cy="12" r="6.5" stroke={color} strokeWidth="0.5" fill="none" opacity="0.6" />
      <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth="0.5" fill="none" opacity="0.6" />
      
      {/* Center label */}
      <Circle cx="12" cy="12" r="3.5" fill={color} opacity="0.3" />
      
      {/* Center hole */}
      <Circle cx="12" cy="12" r="1.5" fill="none" stroke={color} strokeWidth="1.5" />
    </Svg>
  );
};

export default VinylIcon;
