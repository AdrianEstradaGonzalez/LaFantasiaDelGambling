import { Dimensions, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: '#0f0f0f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,

    // Gradiente sutil y borde superior elegante
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',

    // Sombra más elegante
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },

  // Contenedor de cada botón
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 50,
    backgroundColor: 'transparent',
  },

  // Botón activo con efecto glow
  navButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Iconos base
  navIcon: {
    width: 28,
    height: 28,
    tintColor: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },

  // Icono activo
  navIconActive: {
    tintColor: '#3b82f6',
    width: 32,
    height: 32,
  },

  // Texto de los botones
  navText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    textAlign: 'center',
  },

  navTextActive: {
    color: '#3b82f6',
    fontWeight: '700',
  },

  // Botones específicos legacy (mantener para compatibilidad)
  homeButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  arrow: {
    position: 'absolute',
    left: '1%',
  },

  inviteIcon: {
    width: 40,
    height: 40,
  },

  homeIcon: {
    width: 50,
    height: 50,
  },

  logoutButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoutIcon: {
    width: 50,
    height: 50,
  },
});

export default styles;
