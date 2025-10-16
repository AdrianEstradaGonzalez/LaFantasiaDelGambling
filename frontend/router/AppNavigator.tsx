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
import PlayersMarket from '../pages/players/PlayersMarket';
import PlayerDetail from '../pages/players/PlayerDetail';
import MiPlantilla from '../pages/plantilla/MiPlantilla';
import FootballService from '../services/FutbolService';
import { InvitarAmigos } from '../pages/liga/InvitarAmigos';
import Apuestas from '../pages/apuestas/Apuestas';
import AdminPanel from '../pages/admin/AdminPanel';
import { GestionJugadores } from '../pages/admin/GestionJugadores';
import GestionUsuarios from '../pages/admin/GestionUsuarios';
import GestionLigas from '../pages/admin/GestionLigas';

export type RootStackParamList = {
  Home: { refreshLigas?: boolean } | undefined;
  CrearLiga: undefined;
  Login: undefined;
  Register: undefined;
  Clasificacion: { ligaId: string, ligaName: string};
  PlayersList: { selectMode?: boolean; filterByRole?: string; onPlayerSelected?: (player: any) => void; ligaId?: string; ligaName?: string } | undefined;
  PlayersMarket: { ligaId?: string; ligaName?: string } | undefined;
  PlayerDetail: { player: any; ligaId?: string; ligaName?: string };
  MiPlantilla: undefined;
  Equipo: { ligaId: string, ligaName: string};
  InvitarAmigos: { ligaNombre: string, codigo: string, ligaId: string };
  Apuestas: { ligaId?: string; ligaName?: string } | undefined;
  AdminPanel: undefined;
  GestionJugadores: undefined;
  GestionUsuarios: undefined;
  GestionLigas: undefined;
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
        <Stack.Screen name="Login" component={Login} options={{
          animation: 'slide_from_left', // 👈 animación lateral
        }} />
        <Stack.Screen name="Register" component={Register} options={{
          animation: 'slide_from_right', // 👈 animación lateral
        }} />
        <Stack.Screen name="Clasificacion" component={Clasificacion} options={{
          animation: 'slide_from_right', // 👈 animación lateral
        }} />
        <Stack.Screen name="PlayersList" component={PlayersList} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="PlayersMarket" component={PlayersMarket} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="PlayerDetail" component={PlayerDetail} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="MiPlantilla" component={MiPlantilla} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="Equipo" component={MiPlantilla} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="InvitarAmigos" component={InvitarAmigos} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="Apuestas" component={Apuestas} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="AdminPanel" component={AdminPanel} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="GestionJugadores" component={GestionJugadores} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="GestionUsuarios" component={GestionUsuarios} options={{
          animation: 'slide_from_right',
        }} />
        <Stack.Screen name="GestionLigas" component={GestionLigas} options={{
          animation: 'slide_from_right',
        }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
