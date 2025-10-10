import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const HomeStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 48 : 64,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  createButton: {
    backgroundColor: '#475569',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

  // Ligas
  ligasScroll: {
    maxHeight: 110,
    marginBottom: 22,
    paddingLeft: 10,
  },
  ligaCard: {
    backgroundColor: '#1a2332',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    width: '100%',
    minHeight: 64,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'solid',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  ligaName: {
    fontWeight: '700',
    color: '#cbd5e1',
    textAlign: 'center',
    fontSize: 18,
  },

  // New styles for vertical leagues list
  ligasList: {
    paddingHorizontal: 20,
    marginBottom: 18,
  },

  // Calendar / jornadas
  calendarContainer: {
    marginHorizontal: 20,
    marginBottom: 18,
  },
  jornadasScroll: {
    paddingVertical: 6,
  },
  jornadaPill: {
    backgroundColor: '#2a3441',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 10,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  jornadaActive: {
    backgroundColor: '#475569',
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  jornadaText: {
    color: '#cbd5e1',
    fontWeight: '700',
  },
  jornadaTextActive: {
    color: '#fff',
  },

  // Sección de partidos
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 20,
  },

  tableContainer: {
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a2332',
    borderWidth: 1,
    borderColor: '#334155',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    paddingTop: 0,
    paddingBottom: 8,
  },

  tableHeader: {
    backgroundColor: '#334155',
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  tableHeaderText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },

  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    alignItems: 'center',
    backgroundColor: '#1a2332',
  },
  tableCell: {
    fontSize: 15,
    color: '#cbd5e1',
    fontWeight: '600',
  },

  logoutButton: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 56,
    height: 56,
    backgroundColor: '#e53935',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  logoutIcon: {
    width: width * 0.1,
    height: width * 0.1,
  },
});