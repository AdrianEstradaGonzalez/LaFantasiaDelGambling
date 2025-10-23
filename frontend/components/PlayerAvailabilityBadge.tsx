import React from 'react';
import { View, Text } from 'react-native';
import { CheckCircleIcon, InjuryIcon, SuspendedIcon } from './VectorIcons';

interface PlayerAvailabilityBadgeProps {
  status?: string;
  info?: string | null;
  size?: 'small' | 'medium';
}

export const PlayerAvailabilityBadge: React.FC<PlayerAvailabilityBadgeProps> = ({ 
  status = 'AVAILABLE', 
  info,
  size = 'small'
}) => {
  const isSmall = size === 'small';
  const iconSize = isSmall ? 14 : 16;
  const fontSize = isSmall ? 9 : 10;
  const paddingV = isSmall ? 3 : 4;
  const paddingH = isSmall ? 6 : 8;

  if (status === 'INJURED') {
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: 'rgba(239, 68, 68, 0.15)', // Rojo translúcido acorde a la app
        paddingVertical: paddingV,
        paddingHorizontal: paddingH,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        gap: 4
      }}>
        <InjuryIcon size={iconSize} color="#ef4444" />
        <Text style={{ 
          color: '#ef4444', 
          fontWeight: '800', 
          fontSize: fontSize,
          letterSpacing: 0.5
        }}>
          LESIONADO
        </Text>
      </View>
    );
  }

  if (status === 'SUSPENDED') {
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: 'rgba(251, 191, 36, 0.15)', // Amarillo translúcido
        paddingVertical: paddingV,
        paddingHorizontal: paddingH,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.3)',
        gap: 4
      }}>
        <SuspendedIcon size={iconSize} color="#fbbf24" />
        <Text style={{ 
          color: '#fbbf24', 
          fontWeight: '800', 
          fontSize: fontSize,
          letterSpacing: 0.5
        }}>
          SANCIONADO
        </Text>
      </View>
    );
  }

  // AVAILABLE
  return (
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: 'rgba(16, 185, 129, 0.15)', // Verde translúcido acorde a la app
      paddingVertical: paddingV,
      paddingHorizontal: paddingH,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.3)',
      gap: 4
    }}>
      <CheckCircleIcon size={iconSize} color="#10b981" />
      <Text style={{ 
        color: '#10b981', 
        fontWeight: '800', 
        fontSize: fontSize,
        letterSpacing: 0.5
      }}>
        DISPONIBLE
      </Text>
    </View>
  );
};
