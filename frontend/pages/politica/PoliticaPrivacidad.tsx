import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeLayout } from '../../components/SafeLayout';
import { ChevronLeftIcon } from '../../components/VectorIcons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type PoliticaPrivacidadProps = {
  navigation: NativeStackNavigationProp<any>;
};

export const PoliticaPrivacidad: React.FC<PoliticaPrivacidadProps> = ({ navigation }) => {
  return (
    <SafeLayout backgroundColor="#181818ff">
      <LinearGradient
        colors={['#181818ff', '#181818ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.navigate('Home')}
        >
          <ChevronLeftIcon size={28} color="#ffffff" />
          <Text style={styles.backButtonText}></Text>
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.header}>
            <Text style={styles.title}>POLÍTICA DE PRIVACIDAD</Text>
            <Text style={styles.subtitle}>DreamLeague</Text>
            <Text style={styles.date}>Última actualización: {new Date().toLocaleDateString('es-ES')}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. INFORMACIÓN AL USUARIO</Text>
            <Text style={styles.paragraph}>
              DreamLeague (en adelante, "la Aplicación"), en cumplimiento del Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo de 27 de abril de 2016 relativo a la protección de las personas físicas en lo que respecta al tratamiento de datos personales (RGPD) y la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD), informa a los usuarios sobre su política de protección de datos de carácter personal.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. RESPONSABLE DEL TRATAMIENTO</Text>
            <Text style={styles.paragraph}>
              La Aplicación es responsable del tratamiento de los datos personales que nos proporcione. La información que nos facilite será tratada de forma confidencial y será incorporada a las correspondientes actividades de tratamiento.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. FINALIDAD DEL TRATAMIENTO</Text>
            <Text style={styles.paragraph}>
              Los datos personales que nos proporcione a través de la Aplicación serán tratados con las siguientes finalidades:
            </Text>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>Gestión del registro y autenticación de usuarios.</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>Permitir la participación en ligas de fantasía de fútbol.</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>Gestión de apuestas, plantillas y puntuaciones.</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>Comunicaciones relacionadas con el funcionamiento de la Aplicación.</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>Cumplir con las obligaciones legales aplicables.</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. LEGITIMACIÓN DEL TRATAMIENTO</Text>
            <Text style={styles.paragraph}>
              La base legal para el tratamiento de sus datos es:
            </Text>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>El consentimiento del usuario al registrarse y utilizar la Aplicación.</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>La ejecución del contrato de uso de servicios que vincula al usuario con la Aplicación.</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>El cumplimiento de obligaciones legales aplicables.</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. DATOS RECOPILADOS</Text>
            <Text style={styles.paragraph}>
              La Aplicación puede recopilar los siguientes tipos de información:
            </Text>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>Datos de identificación: nombre, dirección de correo electrónico.</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>Datos de la cuenta: contraseña cifrada, información de perfil.</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>Datos de juego: plantillas creadas, apuestas realizadas, puntuaciones obtenidas.</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>Datos de uso: información sobre cómo utiliza la Aplicación.</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. CONSERVACIÓN DE DATOS</Text>
            <Text style={styles.paragraph}>
              Los datos personales proporcionados se conservarán:
            </Text>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>Mientras se mantenga activa la cuenta de usuario.</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>Durante el tiempo necesario para cumplir con las finalidades para las que se recogieron.</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>Durante los plazos legalmente establecidos para el cumplimiento de obligaciones legales.</Text>
            </View>
            <Text style={styles.paragraph}>
              Una vez finalizada la relación contractual o revocado el consentimiento, los datos serán eliminados o anonimizados, salvo que deban conservarse para atender posibles responsabilidades derivadas del tratamiento.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. DESTINATARIOS DE LOS DATOS</Text>
            <Text style={styles.paragraph}>
              Sus datos personales no serán cedidos a terceros, salvo en los siguientes casos:
            </Text>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>Cuando exista una obligación legal.</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>Proveedores de servicios tecnológicos necesarios para el funcionamiento de la Aplicación (hosting, bases de datos), que actúan como encargados del tratamiento.</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>Otros usuarios de la misma liga (nombre de usuario y estadísticas de juego).</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. TRANSFERENCIAS INTERNACIONALES</Text>
            <Text style={styles.paragraph}>
              En caso de que se realicen transferencias internacionales de datos a países fuera del Espacio Económico Europeo (EEE), se garantizará que dichas transferencias cumplan con las garantías adecuadas conforme al RGPD, mediante la adopción de cláusulas contractuales tipo aprobadas por la Comisión Europea o certificaciones adecuadas.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. DERECHOS DEL USUARIO</Text>
            <Text style={styles.paragraph}>
              Como usuario, usted tiene derecho a:
            </Text>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}><Text style={styles.bold}>Acceso:</Text> Conocer qué datos personales estamos tratando.</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}><Text style={styles.bold}>Rectificación:</Text> Solicitar la corrección de datos inexactos o incompletos.</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}><Text style={styles.bold}>Supresión:</Text> Solicitar la eliminación de sus datos cuando ya no sean necesarios.</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}><Text style={styles.bold}>Oposición:</Text> Oponerse al tratamiento de sus datos.</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}><Text style={styles.bold}>Limitación:</Text> Solicitar la limitación del tratamiento de sus datos.</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}><Text style={styles.bold}>Portabilidad:</Text> Recibir sus datos en un formato estructurado y de uso común.</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}><Text style={styles.bold}>Revocación del consentimiento:</Text> Retirar el consentimiento en cualquier momento.</Text>
            </View>
            <Text style={styles.paragraph}>
              Para ejercer estos derechos, puede contactarnos a través de la configuración de la Aplicación o eliminando su cuenta desde el menú de usuario.
            </Text>
            <Text style={styles.paragraph}>
              Asimismo, tiene derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es) si considera que el tratamiento de sus datos no es conforme a la normativa.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. MEDIDAS DE SEGURIDAD</Text>
            <Text style={styles.paragraph}>
              La Aplicación ha adoptado las medidas técnicas y organizativas necesarias para garantizar la seguridad de los datos personales y evitar su alteración, pérdida, tratamiento o acceso no autorizado, teniendo en cuenta el estado de la tecnología, la naturaleza de los datos y los riesgos a los que están expuestos.
            </Text>
            <Text style={styles.paragraph}>
              Entre las medidas implementadas se incluyen:
            </Text>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>Cifrado de contraseñas y datos sensibles.</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>Comunicaciones seguras mediante protocolos HTTPS.</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>Control de accesos mediante autenticación.</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>Copias de seguridad periódicas.</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. COOKIES Y TECNOLOGÍAS SIMILARES</Text>
            <Text style={styles.paragraph}>
              La Aplicación puede utilizar tecnologías de almacenamiento local para mejorar la experiencia del usuario, como el almacenamiento de preferencias y sesiones. El usuario puede gestionar estas preferencias desde la configuración de su dispositivo.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>12. MENORES DE EDAD</Text>
            <Text style={styles.paragraph}>
              La Aplicación no está dirigida a menores de 14 años. No recopilamos intencionadamente datos personales de menores de edad. Si un padre o tutor tiene conocimiento de que un menor ha proporcionado datos personales sin su consentimiento, debe contactarnos para que procedamos a su eliminación.
            </Text>
            <Text style={styles.paragraph}>
              Para usuarios entre 14 y 18 años, se requiere el consentimiento de los padres o tutores legales para el tratamiento de sus datos personales.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>13. MODIFICACIONES DE LA POLÍTICA</Text>
            <Text style={styles.paragraph}>
              La Aplicación se reserva el derecho de modificar esta Política de Privacidad para adaptarla a cambios legislativos, jurisprudenciales o en las prácticas del sector. Cuando se realicen modificaciones sustanciales, se notificará a los usuarios con antelación suficiente a su implementación.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>14. LEGISLACIÓN APLICABLE</Text>
            <Text style={styles.paragraph}>
              Esta Política de Privacidad se rige por la legislación española y europea en materia de protección de datos personales:
            </Text>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo (RGPD)</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>Ley Orgánica 3/2018, de 5 de diciembre (LOPDGDD)</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE)</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>15. CONTACTO</Text>
            <Text style={styles.paragraph}>
              Para cualquier consulta relacionada con esta Política de Privacidad o para ejercer sus derechos, puede contactarnos a través de la propia Aplicación o al siguiente correo: dreamleague.contactme@gmail.com
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Al utilizar esta Aplicación, usted acepta esta Política de Privacidad y consiente el tratamiento de sus datos personales conforme a lo establecido en la misma.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#334155',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#60a5fa',
    marginBottom: 8,
  },
  date: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#93c5fd',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: '#cbd5e1',
    marginBottom: 12,
    textAlign: 'justify',
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 10,
  },
  bullet: {
    fontSize: 14,
    color: '#60a5fa',
    marginRight: 8,
    lineHeight: 22,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: '#cbd5e1',
  },
  bold: {
    fontWeight: '700',
    color: '#e5e7eb',
  },
  footer: {
    marginTop: 30,
    padding: 16,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#60a5fa',
  },
  footerText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingLeft: 20,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default PoliticaPrivacidad;
