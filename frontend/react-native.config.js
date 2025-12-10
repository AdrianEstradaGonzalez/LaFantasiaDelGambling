module.exports = {
  dependencies: {
    'react-native-iap': {
      platforms: {
        android: null, // Excluir en Android (solo iOS)
      },
    },
    'react-native-nitro-modules': {
      platforms: {
        android: null, // Excluir en Android (dependencia de react-native-iap)
      },
    },
  },
};
