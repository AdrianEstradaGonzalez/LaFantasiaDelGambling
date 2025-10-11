import React from 'react';
import { View, Image } from 'react-native';

const LoadingScreen = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={require('../assets/logo.png')}
        style={{ width: 140, height: 140, resizeMode: 'contain' }}
      />
    </View>
  );
};

export default LoadingScreen;
