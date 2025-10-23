import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { 
  AlertIcon, 
  AlertCircleIcon, 
  InformationIcon, 
  CheckCircleLargeIcon, 
  ErrorCircleIcon,
  LockIcon 
} from './VectorIcons';

interface CustomAlertButton {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  title?: string;
  message: string;
  buttons?: CustomAlertButton[];
  icon?: string;
  iconColor?: string;
  onDismiss?: () => void;
}

export const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  buttons = [{ text: 'OK', onPress: () => {}, style: 'default' }],
  icon,
  iconColor = '#0892D0',
  onDismiss,
}) => {
  const handleButtonPress = (button: CustomAlertButton) => {
    button.onPress();
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          {/* Header */}
          <LinearGradient
            colors={['#1a2332', '#1a2332']}
            style={styles.header}
          >
            <Text style={styles.headerText}>
              LIGA <Text style={styles.headerTextBlue}>DREAMLEAGUE</Text>
            </Text>
          </LinearGradient>

          {/* Content */}
          <ScrollView 
            style={styles.contentScroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={true}
            bounces={false}
          >
            {/* Icon */}
            {icon && (
              <View style={styles.iconContainer}>
                {icon === 'alert' && <AlertIcon size={48} color={iconColor} />}
                {icon === 'alert-circle' && <AlertCircleIcon size={48} color={iconColor} />}
                {icon === 'information' && <InformationIcon size={48} color={iconColor} />}
                {icon === 'check-circle' && <CheckCircleLargeIcon size={48} color={iconColor} />}
                {icon === 'error-circle' && <ErrorCircleIcon size={48} color={iconColor} />}
                {icon === 'lock-closed' && <LockIcon size={48} color={iconColor} />}
              </View>
            )}

            {/* Title */}
            {title && (
              <Text style={styles.title}>{title}</Text>
            )}

            {/* Message */}
            <Text style={styles.message}>{message}</Text>
          </ScrollView>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            {buttons.map((button, index) => {
              const isDestructive = button.style === 'destructive';
              const isCancel = button.style === 'cancel';
              
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleButtonPress(button)}
                  style={[
                    styles.button,
                    buttons.length === 1 && styles.buttonSingle,
                    isDestructive && styles.buttonDestructive,
                    isCancel && styles.buttonCancel,
                    index > 0 && styles.buttonMarginLeft,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isDestructive && styles.buttonTextDestructive,
                      isCancel && styles.buttonTextCancel,
                    ]}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#181818ff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#cbd5e1',
    letterSpacing: 0.5,
  },
  headerTextBlue: {
    color: '#0892D0',
  },
  contentScroll: {
    maxHeight: 320, // Limitar altura máxima para activar scroll
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  message: {
    fontSize: 15,
    fontWeight: '500',
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    padding: 12,
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#0892D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSingle: {
    flex: 1,
  },
  buttonMarginLeft: {
    marginLeft: 0,
  },
  buttonCancel: {
    backgroundColor: '#334155',
  },
  buttonDestructive: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  buttonTextCancel: {
    color: '#cbd5e1',
  },
  buttonTextDestructive: {
    color: '#fff',
  },
});

// Hook para usar el CustomAlert de forma similar a Alert.alert()
export class CustomAlertManager {
  private static alertRef: {
    show: (props: Omit<CustomAlertProps, 'visible' | 'onDismiss'>) => void;
  } | null = null;

  static setAlertRef(ref: any) {
    this.alertRef = ref;
  }

  static alert(
    title: string,
    message?: string,
    buttons?: CustomAlertButton[],
    options?: { icon?: string; iconColor?: string }
  ) {
    if (this.alertRef) {
      this.alertRef.show({
        title,
        message: message || '',
        buttons: buttons || [{ text: 'OK', onPress: () => {}, style: 'default' }],
        icon: options?.icon,
        iconColor: options?.iconColor,
      });
    }
  }
}

// Componente Provider para manejar el alert globalmente
export const CustomAlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alertProps, setAlertProps] = React.useState<Omit<CustomAlertProps, 'visible' | 'onDismiss'> | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    CustomAlertManager.setAlertRef({
      show: (props: Omit<CustomAlertProps, 'visible' | 'onDismiss'>) => {
        setAlertProps(props);
        setVisible(true);
      },
    });
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => setAlertProps(null), 300);
  };

  return (
    <>
      {children}
      {alertProps && (
        <CustomAlert
          {...alertProps}
          visible={visible}
          onDismiss={handleDismiss}
        />
      )}
    </>
  );
};

export default CustomAlert;
