import React from 'react';
import { View, StatusBar, Platform, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface SafeLayoutProps {
  children: React.ReactNode;
  backgroundColor?: string;
  statusBarStyle?: 'light-content' | 'dark-content';
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
}

/**
 * Componente que envuelve el contenido con SafeAreaView
 * para evitar que se superpongan con las barras del sistema (notch, botones de navegación, etc.)
 */
export const SafeLayout: React.FC<SafeLayoutProps> = ({
  children,
  backgroundColor = '#0f172a',
  statusBarStyle = 'light-content',
  edges = ['top', 'bottom'],
}) => {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={edges}>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={backgroundColor}
        translucent={Platform.OS === 'android'}
      />
      {children}
    </SafeAreaView>
  );
};

/**
 * Hook personalizado para obtener el padding necesario para SafeArea
 * Útil cuando no puedes usar SafeAreaView directamente
 */
export const useSafePadding = () => {
  const insets = useSafeAreaInsets();
  
  return {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };
};

/**
 * Componente para espaciado superior (status bar)
 */
export const SafeTopSpacer: React.FC<{ backgroundColor?: string }> = ({ backgroundColor = 'transparent' }) => {
  const insets = useSafeAreaInsets();
  return <View style={{ height: insets.top, backgroundColor }} />;
};

/**
 * Componente para espaciado inferior (navigation bar)
 */
export const SafeBottomSpacer: React.FC<{ backgroundColor?: string }> = ({ backgroundColor = 'transparent' }) => {
  const insets = useSafeAreaInsets();
  return <View style={{ height: insets.bottom, backgroundColor }} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
