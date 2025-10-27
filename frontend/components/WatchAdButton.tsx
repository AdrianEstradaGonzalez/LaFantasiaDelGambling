import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { CoinsIcon } from './VectorIcons';

interface WatchAdButtonProps {
  /**
   * Texto del botón
   */
  text?: string;
  
  /**
   * Callback al presionar el botón
   */
  onPress: () => void;
  
  /**
   * Si el anuncio está cargando
   */
  loading?: boolean;
  
  /**
   * Si el botón está deshabilitado
   */
  disabled?: boolean;
  
  /**
   * Estilo personalizado
   */
  style?: any;
}

/**
 * Botón estilizado para ver anuncios con recompensa
 * Uso: <WatchAdButton onPress={handleWatchAd} loading={isLoading} />
 */
export const WatchAdButton: React.FC<WatchAdButtonProps> = ({
  text = 'Ver anuncio para obtener recompensa',
  onPress,
  loading = false,
  disabled = false,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        disabled && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <View style={styles.content}>
          <CoinsIcon size={20} color="#ffffff" />
          <Text style={styles.text}>{text}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonDisabled: {
    backgroundColor: '#64748b',
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
