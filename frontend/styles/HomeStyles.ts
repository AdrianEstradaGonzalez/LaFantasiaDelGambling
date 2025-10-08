import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const HomeStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 48 : 64,
    backgroundColor: '#18395a',
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
    backgroundColor: '#1f6a44',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 20,
  },

  // Ligas
  ligasScroll: {
    maxHeight: 110,
    marginBottom: 22,
    paddingLeft: 10,
  },
  ligaCard: {
    backgroundColor: '#ffffff',
    // straight rectangular card (professional)
    borderRadius: 0,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    width: '100%',
    minHeight: 64,
    justifyContent: 'center',
    alignItems: 'center',
    // fine black border for a clean professional look
    borderWidth: 1,
    borderColor: '#000000',
    borderStyle: 'solid',
    // subtle elevation/shadow
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  ligaName: {
    fontWeight: '700',
    color: '#18395a',
    textAlign: 'center',
    fontSize: 20,
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
    marginTop: 8,
    paddingVertical: 6,
  },
  jornadaPill: {
    backgroundColor: '#f2f2f2',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 10,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  jornadaActive: {
    backgroundColor: '#1f6a44',
    borderColor: '#0f4f34',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  jornadaText: {
    color: '#18395a',
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
    marginBottom: 12,
  },

  tableContainer: {
    marginHorizontal: 20,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    paddingVertical: 8,
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1f6a44',
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  tableHeaderText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  tableCell: {
    fontSize: 15,
    color: '#18395a',
    fontWeight: '600',
  },

  // Logout button (floating)
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
