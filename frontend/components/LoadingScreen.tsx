import React, { useEffect, useRef } from 'react';
import { View, Image, Animated, StyleSheet } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

const LoadingScreen = () => {
  // Animaciones para las estrellas
  const star1Scale = useRef(new Animated.Value(1)).current;
  const star1Rotate = useRef(new Animated.Value(0)).current;
  const star2Scale = useRef(new Animated.Value(1)).current;
  const star2Rotate = useRef(new Animated.Value(0)).current;
  const circleScale = useRef(new Animated.Value(1)).current;

  // Función para generar puntos de estrella
  const getStarPoints = (outerRadius: number, innerRadius: number, points: number = 8) => {
    const angleStep = (Math.PI * 2) / points;
    const centerX = 70;
    const centerY = 70;
    
    let pathPoints = '';
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * angleStep / 2) - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      pathPoints += `${x},${y} `;
    }
    return pathPoints.trim();
  };

  useEffect(() => {
    // Animación de la estrella 1 (más grande, detrás)
    const star1Animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(star1Scale, {
            toValue: 1.3,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(star1Scale, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(star1Rotate, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    );

    // Animación de la estrella 2 (más pequeña, delante, rotación opuesta)
    const star2Animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(star2Scale, {
            toValue: 1.2,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(star2Scale, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(star2Rotate, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );

    // Animación del círculo central (pulso sutil)
    const circleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(circleScale, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(circleScale, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    star1Animation.start();
    star2Animation.start();
    circleAnimation.start();

    return () => {
      star1Animation.stop();
      star2Animation.stop();
      circleAnimation.stop();
    };
  }, [star1Scale, star1Rotate, star2Scale, star2Rotate, circleScale]);

  const star1Points = getStarPoints(60, 35, 8);
  const star2Points = getStarPoints(50, 30, 8);

  const star1Interpolate = star1Rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const star2Interpolate = star2Rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Estrella 1 - Más grande, detrás, rotación lenta */}
      <Animated.View
        style={[
          styles.starContainer,
          {
            transform: [
              { scale: star1Scale },
              { rotate: star1Interpolate },
            ],
          },
        ]}
      >
        <Svg height="140" width="140" viewBox="0 0 140 140">
          <Polygon
            points={star1Points}
            fill="rgba(255, 255, 255, 0.3)"
            stroke="rgba(255, 255, 255, 0.5)"
            strokeWidth="1"
          />
        </Svg>
      </Animated.View>

      {/* Estrella 2 - Más pequeña, delante, rotación opuesta */}
      <Animated.View
        style={[
          styles.starContainer,
          {
            transform: [
              { scale: star2Scale },
              { rotate: star2Interpolate },
            ],
          },
        ]}
      >
        <Svg height="140" width="140" viewBox="0 0 140 140">
          <Polygon
            points={star2Points}
            fill="rgba(255, 255, 255, 0.5)"
            stroke="rgba(255, 255, 255, 0.7)"
            strokeWidth="1"
          />
        </Svg>
      </Animated.View>

      {/* Círculo blanco central */}
      <Animated.View
        style={[
          styles.circleContainer,
          {
            transform: [{ scale: circleScale }],
          },
        ]}
      >
        <View style={styles.circle} />
      </Animated.View>

      {/* Logo encima de todo */}
      <Image
        key="loading-screen-logo"
        source={require('../assets/logo.png')}
        style={styles.logo}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starContainer: {
    position: 'absolute',
  },
  circleContainer: {
    position: 'absolute',
  },
  circle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  logo: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
    zIndex: 10,
  },
});

export default LoadingScreen;
