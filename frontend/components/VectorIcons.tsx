import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  isActive?: boolean;
}

export const HomeIcon = ({ size = 24, color = '#ffffff', isActive = false }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
      stroke={isActive ? '#3b82f6' : color}
      strokeWidth={isActive ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={isActive ? 'rgba(59, 130, 246, 0.1)' : 'none'}
    />
    <Path
      d="M9 22V12h6v10"
      stroke={isActive ? '#3b82f6' : color}
      strokeWidth={isActive ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const TrophyIcon = ({ size = 24, color = '#ffffff', isActive = false }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18"
      stroke={isActive ? '#3b82f6' : color}
      strokeWidth={isActive ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6 9a6 6 0 1012 0v3a6 6 0 01-12 0V9z"
      stroke={isActive ? '#3b82f6' : color}
      strokeWidth={isActive ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={isActive ? 'rgba(59, 130, 246, 0.1)' : 'none'}
    />
    <Path
      d="M8 22h8M12 18v4"
      stroke={isActive ? '#3b82f6' : color}
      strokeWidth={isActive ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ShieldIcon = ({ size = 24, color = '#ffffff', isActive = false }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      stroke={isActive ? '#3b82f6' : color}
      strokeWidth={isActive ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={isActive ? 'rgba(59, 130, 246, 0.1)' : 'none'}
    />
  </Svg>
);

export const UsersIcon = ({ size = 24, color = '#ffffff', isActive = false }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
      stroke={isActive ? '#3b82f6' : color}
      strokeWidth={isActive ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle
      cx="9"
      cy="7"
      r="4"
      stroke={isActive ? '#3b82f6' : color}
      strokeWidth={isActive ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={isActive ? 'rgba(59, 130, 246, 0.1)' : 'none'}
    />
    <Path
      d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
      stroke={isActive ? '#3b82f6' : color}
      strokeWidth={isActive ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const TargetIcon = ({ size = 24, color = '#ffffff', isActive = false }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle
      cx="12"
      cy="12"
      r="10"
      stroke={isActive ? '#3b82f6' : color}
      strokeWidth={isActive ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={isActive ? 'rgba(59, 130, 246, 0.1)' : 'none'}
    />
    <Circle
      cx="12"
      cy="12"
      r="6"
      stroke={isActive ? '#3b82f6' : color}
      strokeWidth={isActive ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle
      cx="12"
      cy="12"
      r="2"
      stroke={isActive ? '#3b82f6' : color}
      strokeWidth={isActive ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const LogoutIcon = ({ size = 24, color = '#ffffff', isActive = false }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
      stroke={isActive ? '#ef4444' : color}
      strokeWidth={isActive ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);