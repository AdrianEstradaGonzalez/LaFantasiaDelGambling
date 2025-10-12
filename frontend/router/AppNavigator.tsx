import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// 🧩 Importa tus pantallas
import { Home } from '../pages/home/Home';
import { CrearLiga } from '../pages/liga/CrearLiga';
import Login from '../pages/login/Login';
import Register from '../pages/register/Register';
import Clasificacion from '../pages/liga/Clasificacion';
import PlayersList from '../pages/players/PlayersList';
import MiPlantilla from '../pages/plantilla/MiPlantilla';
import FootballService from '../services/FutbolService';
import { InvitarAmigos } from '../pages/liga/InvitarAmigos';

export type RootStackParamList = {
  Home: { refreshLigas?: boolean } | undefined;
  CrearLiga: undefined;
  Login: undefined;
  Register: undefined;
  Clasificacion: { ligaId: string, ligaName: string};
  PlayersList: { selectMode?: boolean; filterByRole?: string; onPlayerSelected?: (player: any) => void; ligaId?: string; ligaName?: string } | undefined;
  MiPlantilla: undefined;
  Equipo: { ligaId: string, ligaName: string};
  InvitarAmigos: { ligaNombre: string, codigo: string, ligaId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  useEffect(() => {
    // Prefetch equipos y jugadores al iniciar la app para minimizar peticiones posteriores
    FootballService.prefetchAllData().catch(() => {});
  }, []);
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false, // oculta el header por defecto
        }}
      >
        {/* <Stack.Screen name="Login" component={Login} /> */}
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen
          name="CrearLiga"
          component={CrearLiga}
          options={{
            animation: 'slide_from_right', // 👈 animación lateral
          }}
        />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Register" component={Register} options={{
          animation: 'slide_from_right', // 👈 animación lateral
        }} />
        <Stack.Screen name="Clasificacion" component={Clasificacion} options={{
          animation: 'slide_from_right', // 👈 animación lateral
        }} />
        <Stack.Screen name="PlayersList" component={PlayersList} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="MiPlantilla" component={MiPlantilla} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="Equipo" component={MiPlantilla} options={{
          animation: 'slide_from_right',
        }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
