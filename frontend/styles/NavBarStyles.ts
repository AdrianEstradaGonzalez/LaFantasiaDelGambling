import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
navBar: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: 70,
  backgroundColor: '#ffffffff',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 20,

  // 🔹 Borde superior sutil
  borderTopWidth: 1,
  borderTopColor: 'rgba(0, 0, 0, 0.1)',

  // 🔹 Sombra hacia arriba (suave)
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.08,
  shadowRadius: 10,
  elevation: 6,
},

   // 🏠 Home centrado en la barra
  homeButton: {
    position: 'absolute',
    left: '50%',
  },

  homeIcon: {
    width: 32,
    height: 32,
  },

  logoutButton: {
    marginLeft: 'auto',
  },

  logoutIcon: {
    width: 32,
    height: 32,
    tintColor: '#000', // tono verde profesional para el icono
  },
});

export default styles;
