import React from 'react';
import { View, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

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
  const iconSize = isSmall ? 12 : 16;
  const fontSize = isSmall ? 9 : 11;
  const paddingV = isSmall ? 3 : 4;
  const paddingH = isSmall ? 6 : 8;

  if (status === 'INJURED') {
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#fef2f2',
        paddingVertical: paddingV,
        paddingHorizontal: paddingH,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#fecaca',
        gap: 4
      }}>
        <MaterialCommunityIcons name="hospital-box" size={iconSize} color="#dc2626" />
        <Text style={{ 
          color: '#dc2626', 
          fontWeight: '700', 
          fontSize: fontSize,
          letterSpacing: 0.3
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
        backgroundColor: '#fef3c7',
        paddingVertical: paddingV,
        paddingHorizontal: paddingH,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#fde047',
        gap: 4
      }}>
        <Ionicons name="card" size={iconSize} color="#dc2626" />
        <Text style={{ 
          color: '#b91c1c', 
          fontWeight: '700', 
          fontSize: fontSize,
          letterSpacing: 0.3
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
      backgroundColor: '#f0fdf4',
      paddingVertical: paddingV,
      paddingHorizontal: paddingH,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#bbf7d0',
      gap: 4
    }}>
      <Ionicons name="checkmark-circle" size={iconSize} color="#16a34a" />
      <Text style={{ 
        color: '#16a34a', 
        fontWeight: '700', 
        fontSize: fontSize,
        letterSpacing: 0.3
      }}>
        DISPONIBLE
      </Text>
    </View>
  );
};
