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
      fill="none"
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
      fill="none"
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
      fill="none"
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
      fill="none"
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
      fill="none"
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

// Icono de clasificación/tabla con números de posición
export const LeaderboardIcon = ({ size = 24, color = '#ffffff', isActive = false }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="3"
      y="4"
      width="18"
      height="16"
      rx="2"
      stroke={isActive ? '#3b82f6' : color}
      strokeWidth={isActive ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path
      d="M7 8h10M7 12h10M7 16h6"
      stroke={isActive ? '#3b82f6' : color}
      strokeWidth={isActive ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="5" cy="8" r="0.5" fill={isActive ? '#3b82f6' : color} />
    <Circle cx="5" cy="12" r="0.5" fill={isActive ? '#3b82f6' : color} />
    <Circle cx="5" cy="16" r="0.5" fill={isActive ? '#3b82f6' : color} />
  </Svg>
);

// Icono de campo de fútbol
export const JerseyIcon = ({ size = 24, color = '#ffffff', isActive = false }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="2"
      y="4"
      width="20"
      height="16"
      rx="2"
      stroke={isActive ? '#3b82f6' : color}
      strokeWidth={isActive ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* Línea central */}
    <Path
      d="M12 4v16"
      stroke={isActive ? '#3b82f6' : color}
      strokeWidth={isActive ? 2.5 : 2}
      strokeLinecap="round"
    />
    {/* Círculo central */}
    <Circle
      cx="12"
      cy="12"
      r="3"
      stroke={isActive ? '#3b82f6' : color}
      strokeWidth={isActive ? 2.5 : 2}
      fill="none"
    />
    {/* Áreas de penalti */}
    <Rect
      x="2"
      y="8"
      width="4"
      height="8"
      stroke={isActive ? '#3b82f6' : color}
      strokeWidth={isActive ? 2.5 : 2}
      fill="none"
    />
    <Rect
      x="18"
      y="8"
      width="4"
      height="8"
      stroke={isActive ? '#3b82f6' : color}
      strokeWidth={isActive ? 2.5 : 2}
      fill="none"
    />
  </Svg>
);

// Icono de bolsa de la compra
export const TrendingIcon = ({ size = 24, color = '#ffffff', isActive = false }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"
      stroke={isActive ? '#3b82f6' : color}
      strokeWidth={isActive ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path
      d="M3 6h18"
      stroke={isActive ? '#3b82f6' : color}
      strokeWidth={isActive ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16 10a4 4 0 01-8 0"
      stroke={isActive ? '#3b82f6' : color}
      strokeWidth={isActive ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Icono de símbolo de dólar
export const DiceIcon = ({ size = 24, color = '#ffffff', isActive = false }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle
      cx="12"
      cy="12"
      r="10"
      stroke={isActive ? '#3b82f6' : color}
      strokeWidth={isActive ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path
      d="M12 6v12M9.5 9a2.5 2.5 0 015 0c0 2-3 3-3 3s3 1 3 3a2.5 2.5 0 11-5 0"
      stroke={isActive ? '#3b82f6' : color}
      strokeWidth={isActive ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Icono de editar (lápiz)
export const EditIcon = ({ size = 24, color = '#ffffff' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Icono de eliminar (papelera)
export const DeleteIcon = ({ size = 24, color = '#ffffff' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M10 11v6M14 11v6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Icono de confirmar (check)
export const CheckIcon = ({ size = 24, color = '#ffffff' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 6L9 17l-5-5"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Icono de check en círculo (success)
export const CheckCircleIcon = ({ size = 24, color = '#ffffff' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle
      cx="12"
      cy="12"
      r="10"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path
      d="M9 12l2 2 4-4"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Icono de error (X en círculo)
export const ErrorIcon = ({ size = 24, color = '#ffffff' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle
      cx="12"
      cy="12"
      r="10"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path
      d="M15 9l-6 6M9 9l6 6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Icono de calendario
export const CalendarIcon = ({ size = 24, color = '#ffffff' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="3"
      y="4"
      width="18"
      height="18"
      rx="2"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path
      d="M16 2v4M8 2v4M3 10h18"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Icono de reloj
export const ClockIcon = ({ size = 24, color = '#ffffff' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle
      cx="12"
      cy="12"
      r="10"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path
      d="M12 6v6l4 2"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);