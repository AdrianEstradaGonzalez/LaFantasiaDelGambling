import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

type HomeProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

export const Home = ({ navigation }: HomeProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>¡Bienvenido a Home!</Text>
      <Button title="Cerrar sesión" onPress={() => navigation.replace('Login')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
  },
});
