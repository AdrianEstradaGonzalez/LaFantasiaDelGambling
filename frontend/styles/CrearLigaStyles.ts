import { StyleSheet, Dimensions, Platform } from 'react-native';
const { width } = Dimensions.get('window');

export const CrearLigaStyles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingTop: Platform.OS === 'android' ? 60 : 80,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#2c2a2aff',
    justifyContent: 'center',
  },

  // Logo y título
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: width * 0.35,
    height: width * 0.35,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },

  // Secciones
  section: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 0,
    paddingVertical: 20,
    paddingHorizontal: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#000',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#18395a',
    marginBottom: 12,
    textAlign: 'left',
  },

  // Input
  input: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#18395a',
    marginBottom: 16,
  },

  // Botón (idéntico estilo a las ligas de Home)
  ligaButton: {
    backgroundColor: '#1f6a44',
    borderRadius: 0,
    paddingVertical: 14,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  ligaButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
});
