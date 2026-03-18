import React from 'react';
import Svg, {Path} from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export const PlayIcon: React.FC<IconProps> = ({size = 24, color = '#ffffff'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M8 5v14l11-7z" />
  </Svg>
);

export const PauseIcon: React.FC<IconProps> = ({size = 24, color = '#ffffff'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M6 4h4v16H6zM14 4h4v16h-4z" />
  </Svg>
);

export const SkipBackIcon: React.FC<IconProps> = ({size = 24, color = '#ffffff'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M6 6h2v12H6zM9.5 12l8.5 6V6z" />
  </Svg>
);

export const SkipForwardIcon: React.FC<IconProps> = ({size = 24, color = '#ffffff'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M16 18h2V6h-2zM6 18l8.5-6L6 6z" />
  </Svg>
);
