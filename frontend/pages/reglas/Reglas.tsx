import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeLayout } from '../../components/SafeLayout';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  TrophyIcon,
  DiceIcon,
  ShieldIcon,
  TacticsIcon,
  ChartBarIcon,
  UsersIcon,
  FootballIcon,
  ClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  ErrorIcon,
  FileTextIcon,
  YellowCardIcon,
  RedCardIcon,
  TargetIcon,
  SaveIcon,
  CleanSheetIcon,
  ShotOnTargetIcon,
  DribbleIcon,
  KeyPassIcon,
  DuelIcon,
  RecoveryIcon,
  AssistIcon,
  MinutesIcon,
  AlertCircleIcon,
  ChevronLeftIcon,
} from '../../components/VectorIcons';

type ReglasProps = {
  navigation: NativeStackNavigationProp<any>;
};

const SCREEN_WIDTH = Dimensions.get('window').width;

export const Reglas: React.FC<ReglasProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  const tabTitles = ['¿Cómo jugar?', '¿Cómo se puntúa?'];

  const handleTabPress = (index: number) => {
    setActiveTab(index);
    scrollViewRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true,
    });
    
    // Animar el indicador
    Animated.spring(tabIndicatorAnim, {
      toValue: index,
      useNativeDriver: true,
      tension: 65,
      friction: 10,
    }).start();
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    
    // Actualizar la posición del indicador mientras se desliza
    const progress = offsetX / SCREEN_WIDTH;
    tabIndicatorAnim.setValue(progress);
    
    if (index !== activeTab) {
      setActiveTab(index);
    }
  };

  return (
    <SafeLayout backgroundColor="#181818ff">
      <LinearGradient
        colors={['#181818ff', '#181818ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        {/* Header con botón de volver y tabs */}
        <View style={{
          backgroundColor: '#1a2332',
          borderBottomWidth: 1,
          borderBottomColor: '#334155',
        }}>
          {/* Botón de volver */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 8,
          }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Home')}
              style={{
                padding: 4,
              }}
              activeOpacity={0.8}
            >
              <ChevronLeftIcon size={28} color="#0892D0" />
            </TouchableOpacity>
            <Text style={{
              color: '#fff',
              fontSize: 20,
              fontWeight: '700',
              marginLeft: 12,
            }}>
              Reglas del Juego
            </Text>
          </View>

          {/* Tabs */}
          <View style={{
            flexDirection: 'row',
            position: 'relative',
          }}>
            <TouchableOpacity
              onPress={() => handleTabPress(0)}
              style={{
                flex: 1,
                paddingVertical: 16,
              }}
            >
              <Text style={{
                color: activeTab === 0 ? '#0892D0' : '#94a3b8',
                fontSize: 16,
                fontWeight: '700',
                textAlign: 'center',
              }}>
                ¿Cómo jugar?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleTabPress(1)}
              style={{
                flex: 1,
                paddingVertical: 16,
              }}
            >
              <Text style={{
                color: activeTab === 1 ? '#0892D0' : '#94a3b8',
                fontSize: 16,
                fontWeight: '700',
                textAlign: 'center',
              }}>
                ¿Cómo se puntúa?
              </Text>
            </TouchableOpacity>

            {/* Indicador animado */}
            <Animated.View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '50%',
                height: 3,
                backgroundColor: '#0892D0',
                transform: [
                  {
                    translateX: tabIndicatorAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, SCREEN_WIDTH / 2],
                    }),
                  },
                ],
              }}
            />
          </View>
        </View>

        {/* Content ScrollView Horizontal */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* Página 1: ¿Cómo jugar? */}
          <ScrollView
            style={{ width: SCREEN_WIDTH }}
            contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          >
            <View style={styles.sectionTitleContainer}>
              <TrophyIcon size={24} color="#0892D0" />
              <Text style={styles.sectionTitle}>CREAR O UNIRSE A UNA LIGA</Text>
            </View>
            <Text style={styles.paragraph}>
              Para empezar, puedes <Text style={styles.bold}>crear tu propia liga</Text> introduciendo un nombre único, o{' '}
              <Text style={styles.bold}>unirte a una liga existente</Text> usando el código de 6 caracteres que tus amigos te compartirán.
            </Text>
            <Text style={styles.paragraph}>
              Cada liga tiene un <Text style={styles.highlight}>código único</Text> que puedes compartir para invitar a más jugadores.
            </Text>

            <View style={styles.divider} />

            <View style={styles.sectionTitleContainer}>
              <ChartBarIcon size={24} color="#0892D0" />
              <Text style={styles.sectionTitle}>PUNTUACIÓN Y CLASIFICACIÓN</Text>
            </View>
            <Text style={styles.paragraph}>
              Tus jugadores obtendrán <Text style={styles.bold}>puntos según sus estadísticas reales</Text> en los partidos de la{' '}
              <Text style={styles.highlight}>Primera División Española</Text> durante la jornada actual.
            </Text>
            <Text style={styles.paragraph}>
              La clasificación se actualiza automáticamente con tus puntos y los del resto de miembros. Puedes consultar:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bold}>Clasificación general:</Text> Suma de todas las jornadas
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bold}>Clasificación por jornada:</Text> Puntuación de una jornada específica
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.sectionTitleContainer}>
              <DiceIcon size={24} color="#0892D0" />
              <Text style={styles.sectionTitle}>PRESUPUESTO Y FICHAJES</Text>
            </View>
            <Text style={styles.paragraph}>
              <Text style={styles.important}>⚠️ IMPORTANTE:</Text> Cada jornada partes de un{' '}
              <Text style={styles.bold}>presupuesto BASE de 500M</Text> (fijo).
            </Text>
            <Text style={styles.paragraph}>
              A estos 500M base se le <Text style={styles.highlight}>suma o resta</Text> una cantidad según tu rendimiento en la jornada anterior:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.highlight}>+1M por cada punto</Text> conseguido con tu plantilla
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Ganancias o pérdidas de <Text style={styles.highlight}>apuestas</Text> (ver sección de apuestas)
              </Text>
            </View>

            <View style={styles.exampleBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <DiceIcon size={20} color="#0892D0" />
                <Text style={[styles.exampleTitle, { marginLeft: 8, marginBottom: 0 }]}>Ejemplo de cálculo:</Text>
              </View>
              <Text style={styles.exampleText}>
                • <Text style={styles.bold}>Jornada 1:</Text> Consigues 85 puntos y ganas 30M en apuestas
              </Text>
              <Text style={styles.exampleText}>
                • <Text style={styles.bold}>Presupuesto Jornada 2:</Text> 500M (base) + 85M (puntos) + 30M (apuestas) ={' '}
                <Text style={styles.highlight}>615M</Text>
              </Text>
              <Text style={[styles.exampleText, { marginTop: 8, color: '#f59e0b', fontWeight: '700' }]}>
                ⚠️ Si te sobran 100M sin gastar, NO se suman a la siguiente jornada
              </Text>
              <Text style={[styles.exampleText, { color: '#cbd5e1' }]}>
                Siempre empiezas desde los <Text style={styles.bold}>500M base</Text>, no se acumula el dinero no usado
              </Text>
            </View>

            <Text style={styles.paragraph}>
              Con tu presupuesto podrás <Text style={styles.bold}>fichar jugadores del mercado</Text>, cada uno con un precio fijo que se verá reflejado en tu plantilla.
            </Text>

            <View style={styles.divider} />

            <View style={styles.sectionTitleContainer}>
              <TacticsIcon size={24} color="#0892D0" />
              <Text style={styles.sectionTitle}>FORMACIONES VÁLIDAS</Text>
            </View>
            <Text style={styles.paragraph}>
              Debes completar un <Text style={styles.bold}>once titular completo</Text> con una de las 7 formaciones válidas:
            </Text>
            {[
              '4-4-2 (1 POR, 4 DEF, 4 CEN, 2 DEL)',
              '4-3-3 (1 POR, 4 DEF, 3 CEN, 3 DEL)',
              '3-4-3 (1 POR, 3 DEF, 4 CEN, 3 DEL)',
              '3-5-2 (1 POR, 3 DEF, 5 CEN, 2 DEL)',
              '5-3-2 (1 POR, 5 DEF, 3 CEN, 2 DEL)',
              '5-4-1 (1 POR, 5 DEF, 4 CEN, 1 DEL)',
              '4-5-1 (1 POR, 4 DEF, 5 CEN, 1 DEL)',
            ].map((formation, idx) => (
              <View key={idx} style={styles.bulletPoint}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>{formation}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.sectionTitleContainer}>
              <FileTextIcon size={24} color="#0892D0" />
              <Text style={styles.sectionTitle}>CONSULTAR DETALLES</Text>
            </View>
            <Text style={styles.paragraph}>
              Puedes acceder a los <Text style={styles.bold}>detalles de cualquier jugador</Text> tanto desde el mercado como desde tu plantilla para consultar:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Puntos obtenidos en cada jornada</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Estadísticas detalladas</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Desglose de puntuación</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.sectionTitleContainer}>
              <TargetIcon size={24} color="#0892D0" />
              <Text style={styles.sectionTitle}>APUESTAS</Text>
            </View>
            <Text style={styles.paragraph}>
              <Text style={styles.important}>⚠️ IMPORTANTE:</Text> El presupuesto de apuestas es{' '}
              <Text style={styles.highlight}>INDEPENDIENTE del presupuesto de fichajes</Text>.
            </Text>
            <Text style={styles.paragraph}>
              Todos los usuarios disponen de <Text style={styles.bold}>250M exclusivamente para apostar</Text>, que se mantiene separado del dinero para fichar jugadores.
            </Text>

            <Text style={styles.subSectionTitle}>Tipos de apuestas disponibles:</Text>
            {/* Listado completo de mercados traducidos al español */}
            {[
              'Ganador del Partido',
              'Doble Oportunidad',
              'Gana Local o Visitante (Sin Empate)',
              'Ambos Equipos Marcan',
              'Más/Menos Goles',
              'Más/Menos Goles Primera Parte',
              'Más/Menos Goles Segunda Parte',
              'Goles Par/Impar',
              'Local Marca un Gol',
              'Visitante Marca un Gol',
              'Local Gana sin Encajar',
              'Visitante Gana sin Encajar',
              'Más/Menos Corners',
              'Más/Menos Tarjetas',
              'Portería a Cero - Local',
              'Portería a Cero - Visitante',
            ].map((t) => (
              <View key={t} style={styles.bulletPoint}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>{t}</Text>
              </View>
            ))}

            <Text style={styles.subSectionTitle}>Reglas de apuestas:</Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bold}>Una apuesta por partido</Text> (10 partidos por jornada = 10 apuestas disponibles)
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Máximo <Text style={styles.highlight}>50M por apuesta</Text>
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Solo puedes elegir <Text style={styles.bold}>una opción por partido</Text>
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Cada apuesta tiene todas sus opciones disponibles (ej: +10.5 corners y -10.5 corners)
              </Text>
            </View>

            <Text style={styles.subSectionTitle}>¿Cómo funcionan las ganancias?</Text>
            <View style={styles.exampleBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <TargetIcon size={20} color="#0892D0" />
                <Text style={[styles.exampleTitle, { marginLeft: 8, marginBottom: 0 }]}>Ejemplo práctico:</Text>
              </View>
              <Text style={styles.exampleText}>
                • Tienes <Text style={styles.bold}>250M de presupuesto de apuestas</Text> (fijo cada jornada)
              </Text>
              <Text style={styles.exampleText}>
                • Apuestas <Text style={styles.bold}>20M</Text> a "Más de 2.5 goles" con cuota <Text style={styles.bold}>2.00</Text>
              </Text>
              <Text style={[styles.exampleText, { marginTop: 8 }]}>
                <Text style={styles.bold}>Si PIERDES:</Text>
              </Text>
              <Text style={styles.exampleText}>
                • Pierdes 20M que se <Text style={styles.important}>restarán de tu presupuesto inicial de fichajes</Text> en la próxima jornada
              </Text>
              <Text style={[styles.exampleText, { marginTop: 8 }]}>
                <Text style={styles.bold}>Si GANAS:</Text>
              </Text>
              <Text style={styles.exampleText}>
                • Ganas <Text style={styles.highlight}>40M</Text> (20M × 2.00 = ganancia completa)
              </Text>
              <Text style={styles.exampleText}>
                • Beneficio neto: +40M que se <Text style={styles.highlight}>sumarán a tu presupuesto inicial de fichajes</Text> en la próxima jornada
              </Text>
              <Text style={[styles.exampleText, { marginTop: 8, color: '#f59e0b', fontWeight: '700' }]}>
                ⚠️ Tu presupuesto de apuestas siempre será 250M cada jornada
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.sectionTitleContainer}>
              <CalendarIcon size={24} color="#0892D0" />
              <Text style={styles.sectionTitle}>FASES DE LA JORNADA</Text>
            </View>
            
            <Text style={styles.subSectionTitle}>🟢 JORNADA ABIERTA (Antes del primer partido)</Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Puedes fichar y vender jugadores libremente</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Puedes modificar tu alineación</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Puedes hacer y modificar apuestas</Text>
            </View>

            <Text style={styles.subSectionTitle}>🔴 JORNADA EN JUEGO (Durante los partidos)</Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.important}>NO puedes hacer cambios</Text> en tu equipo
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.important}>NO puedes</Text> fichar ni vender jugadores
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.important}>NO puedes</Text> modificar apuestas
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Puedes ver <Text style={styles.highlight}>puntuación en tiempo real</Text>
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Puedes consultar <Text style={styles.highlight}>apuestas evaluadas en tiempo real</Text>
              </Text>
            </View>

            <Text style={styles.subSectionTitle}>⚪ CIERRE DE JORNADA (Tras el último partido)</Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Se actualizan clasificaciones finales</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Se calculan presupuestos iniciales para la siguiente jornada</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Se abre de nuevo para preparar la siguiente jornada</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.sectionTitleContainer}>
              <UsersIcon size={24} color="#0892D0" />
              <Text style={styles.sectionTitle}>INVITAR AMIGOS</Text>
            </View>
            <Text style={styles.paragraph}>
              Comparte el <Text style={styles.highlight}>código único de tu liga</Text> (6 caracteres) con tus amigos para que se unan y compitan contigo.
            </Text>
          </ScrollView>

          {/* Página 2: ¿Cómo se puntúa? */}
          <ScrollView
            style={{ width: SCREEN_WIDTH }}
            contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          >
            <View style={styles.sectionTitleContainer}>
              <ChartBarIcon size={24} color="#0892D0" />
              <Text style={styles.sectionTitle}>SISTEMA DE PUNTUACIÓN</Text>
            </View>
            <Text style={styles.paragraph}>
              Los jugadores obtienen puntos según sus <Text style={styles.bold}>estadísticas reales</Text> en los partidos de LaLiga.
            </Text>

            <View style={styles.divider} />

            <View style={styles.sectionTitleContainer}>
              <FootballIcon size={20} color="#0892D0" />
              <Text style={styles.sectionTitle}>PUNTUACIÓN GENERAL</Text>
            </View>

            <View style={styles.pointsBox}>
              <View style={styles.pointsCategory}>
                <MinutesIcon size={18} color="#93c5fd" />
                <Text style={styles.pointsCategoryText}>Minutos jugados</Text>
              </View>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Menos de 45 minutos</Text>
                <Text style={styles.pointValue}>+1</Text>
              </View>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>45 minutos o más</Text>
                <Text style={styles.pointValue}>+2</Text>
              </View>
            </View>

            <View style={styles.pointsBox}>
              <View style={styles.pointsCategory}>
                <AssistIcon size={18} color="#93c5fd" />
                <Text style={styles.pointsCategoryText}>Asistencias</Text>
              </View>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Por asistencia</Text>
                <Text style={styles.pointValue}>+3</Text>
              </View>
            </View>

            <View style={styles.pointsBox}>
              <View style={styles.pointsCategory}>
                <YellowCardIcon size={18} color="#f59e0b" />
                <Text style={styles.pointsCategoryText}>Tarjetas</Text>
              </View>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Tarjeta amarilla</Text>
                <Text style={[styles.pointValue, styles.negative]}>-1</Text>
              </View>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Tarjeta roja</Text>
                <Text style={[styles.pointValue, styles.negative]}>-3</Text>
              </View>
            </View>

            <View style={styles.pointsBox}>
              <View style={styles.pointsCategory}>
                <TargetIcon size={18} color="#93c5fd" />
                <Text style={styles.pointsCategoryText}>Penaltis</Text>
              </View>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Penalti recibido</Text>
                <Text style={styles.pointValue}>+2</Text>
              </View>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Penalti cometido</Text>
                <Text style={[styles.pointValue, styles.negative]}>-2</Text>
              </View>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Penalti fallado</Text>
                <Text style={[styles.pointValue, styles.negative]}>-2</Text>
              </View>
            </View>
            <View style={styles.divider} />

            <View style={styles.sectionTitleContainer}>
              <SaveIcon size={20} color="#0892D0" />
              <Text style={styles.sectionTitle}>PORTEROS</Text>
            </View>

            <View style={styles.pointsBox}>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Gol marcado</Text>
                <Text style={styles.pointValue}>+10</Text>
              </View>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Portería a cero (≥60 min)</Text>
                <Text style={styles.pointValue}>+5</Text>
              </View>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Por parada</Text>
                <Text style={styles.pointValue}>+1</Text>
              </View>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Gol encajado</Text>
                <Text style={[styles.pointValue, styles.negative]}>-2</Text>
              </View>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Penalti parado</Text>
                <Text style={styles.pointValue}>+5</Text>
              </View>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Cada 2 intercepciones</Text>
                <Text style={styles.pointValue}>+1</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.sectionTitleContainer}>
              <ShieldIcon size={20} color="#0892D0" />
              <Text style={styles.sectionTitle}>DEFENSAS</Text>
            </View>

            <View style={styles.pointsBox}>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Gol marcado</Text>
                <Text style={styles.pointValue}>+6</Text>
              </View>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Portería a cero (≥60 min)</Text>
                <Text style={styles.pointValue}>+4</Text>
              </View>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Tiro a puerta</Text>
                <Text style={styles.pointValue}>+1</Text>
              </View>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Cada 2 duelos ganados</Text>
                <Text style={styles.pointValue}>+1</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.sectionTitleContainer}>
              <DribbleIcon size={20} color="#0892D0" />
              <Text style={styles.sectionTitle}>CENTROCAMPISTAS</Text>
            </View>

            <View style={styles.pointsBox}>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Gol marcado</Text>
                <Text style={styles.pointValue}>+5</Text>
              </View>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Tiro a puerta</Text>
                <Text style={styles.pointValue}>+1</Text>
              </View>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Cada pase clave</Text>
                <Text style={styles.pointValue}>+1</Text>
              </View>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Cada 2 regates exitosos</Text>
                <Text style={styles.pointValue}>+1</Text>
              </View>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Cada 3 faltas recibidas</Text>
                <Text style={styles.pointValue}>+1</Text>
              </View>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Cada 2 intercepciones</Text>
                <Text style={styles.pointValue}>+1</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.sectionTitleContainer}>
              <FootballIcon size={20} color="#0892D0" />
              <Text style={styles.sectionTitle}>DELANTEROS</Text>
            </View>

            <View style={styles.pointsBox}>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Gol marcado</Text>
                <Text style={styles.pointValue}>+4</Text>
              </View>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Tiro a puerta</Text>
                <Text style={styles.pointValue}>+1</Text>
              </View>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Cada pase clave</Text>
                <Text style={styles.pointValue}>+1</Text>
              </View>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Cada 2 regates exitosos</Text>
                <Text style={styles.pointValue}>+1</Text>
              </View>
              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>Cada 3 faltas recibidas</Text>
                <Text style={styles.pointValue}>+1</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.sectionTitleContainer}>
              <AlertCircleIcon size={20} color="#0892D0" />
              <Text style={styles.sectionTitle}>NOTAS IMPORTANTES</Text>
            </View>
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>
                • La <Text style={styles.bold}>portería a cero para PORTEROS</Text>: Si el portero jugó al menos{' '}
                <Text style={styles.highlight}>60 minutos</Text> sin recibir goles, cuenta aunque lo sustituyan y su equipo reciba goles después
              </Text>
              <Text style={styles.noteText}>
                • La <Text style={styles.bold}>portería a cero para DEFENSAS</Text>: El defensa debe jugar al menos{' '}
                <Text style={styles.highlight}>60 minutos</Text> y su <Text style={styles.highlight}>equipo NO debe recibir ningún gol en TODO el partido</Text>
              </Text>
              <Text style={styles.noteText}>
                • Los <Text style={styles.bold}>goles de penalti</Text> cuentan como goles normales según la posición
              </Text>
              <Text style={styles.noteText}>
                • Los puntos se calculan automáticamente tras finalizar cada partido
              </Text>
              <Text style={styles.noteText}>
                • Puedes consultar el desglose detallado de puntos de cada jugador en su página de estadísticas
              </Text>
            </View>
          </ScrollView>
        </ScrollView>
      </LinearGradient>
    </SafeLayout>
  );
};

const styles = {
  sectionTitleContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    color: '#0892D0',
    fontSize: 18,
    fontWeight: '800' as const,
    marginLeft: 8,
  },
  subSectionTitle: {
    color: '#93c5fd',
    fontSize: 16,
    fontWeight: '700' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    color: '#e5e7eb',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
  },
  bold: {
    fontWeight: '700' as const,
    color: '#fff',
  },
  highlight: {
    fontWeight: '700' as const,
    color: '#0892D0',
  },
  important: {
    fontWeight: '800' as const,
    color: '#ef4444',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 20,
  },
  bulletPoint: {
    flexDirection: 'row' as const,
    marginBottom: 8,
    paddingLeft: 8,
  },
  bullet: {
    color: '#0892D0',
    fontSize: 18,
    marginRight: 8,
    fontWeight: '700' as const,
  },
  bulletText: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  exampleBox: {
    backgroundColor: '#1a2332',
    borderLeftWidth: 4,
    borderLeftColor: '#0892D0',
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 16,
  },
  exampleTitle: {
    color: '#0892D0',
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  exampleText: {
    color: '#e5e7eb',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },
  pointsBox: {
    backgroundColor: '#1a2332',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pointsCategory: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  pointsCategoryText: {
    color: '#93c5fd',
    fontSize: 16,
    fontWeight: '700' as const,
    marginLeft: 8,
  },
  pointRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2d3748',
  },
  pointLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    flex: 1,
  },
  pointValue: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '800' as const,
    minWidth: 50,
    textAlign: 'right' as const,
  },
  negative: {
    color: '#ef4444',
  },
  noteBox: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  noteText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
};

export default Reglas;
