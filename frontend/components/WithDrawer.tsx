import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, TouchableOpacity, Animated } from 'react-native';
import { DrawerMenu } from './DrawerMenu';

interface WithDrawerProps {
  children: React.ReactNode;
  navigation: any;
  onMenuPress?: () => void;
}

export const WithDrawer: React.FC<WithDrawerProps> = ({ children, navigation, onMenuPress }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    if (isDrawerOpen) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isDrawerOpen, slideAnim]);

  // Pasar la función setIsDrawerOpen a los hijos
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<any>, {
        onMenuPress: onMenuPress || (() => setIsDrawerOpen(true)),
      });
    }
    return child;
  });

  return (
    <>
      {childrenWithProps}
      
      {/* Drawer Modal */}
      <Modal
        visible={isDrawerOpen}
        animationType="none"
        transparent={true}
        onRequestClose={() => setIsDrawerOpen(false)}
      >
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <Animated.View 
            style={{ 
              width: '75%', 
              maxWidth: 300,
              transform: [{ translateX: slideAnim }]
            }}
          >
            <DrawerMenu 
              navigation={{
                ...navigation,
                closeDrawer: () => setIsDrawerOpen(false),
                reset: (state: any) => {
                  navigation.reset(state);
                  setIsDrawerOpen(false);
                },
              }} 
            />
          </Animated.View>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
            activeOpacity={1}
            onPress={() => setIsDrawerOpen(false)}
          />
        </View>
      </Modal>
    </>
  );
};
