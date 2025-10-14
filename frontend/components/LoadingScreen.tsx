import React, { useEffect, useRef } from 'react';
import { View, Image, Animated } from 'react-native';

const LoadingScreen = () => {
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animación de parpadeo sutil
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, [opacityAnim]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.Image
        source={require('../assets/logo.png')}
        style={{ 
          width: 140, 
          height: 140, 
          resizeMode: 'contain',
          opacity: opacityAnim
        }}
      />
    </View>
  );
};

export default LoadingScreen;
