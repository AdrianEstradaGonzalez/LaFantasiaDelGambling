import React, { useRef, useEffect } from 'react';
import { TextInput, TextInputProps, ScrollView, Keyboard, Dimensions, Platform } from 'react-native';

interface SmartTextInputProps extends TextInputProps {
  scrollViewRef?: React.RefObject<ScrollView | null>;
  extraScrollPadding?: number;
}

/**
 * TextInput inteligente que automáticamente hace scroll para quedar visible
 * encima del teclado cuando es enfocado.
 * 
 * Uso:
 * <SmartTextInput 
 *   scrollViewRef={scrollViewRef}
 *   extraScrollPadding={100}
 *   value={value}
 *   onChangeText={onChange}
 *   {...otherTextInputProps}
 * />
 */
export const SmartTextInput = React.forwardRef<TextInput, SmartTextInputProps>(
  ({ scrollViewRef, extraScrollPadding = 120, onFocus, ...textInputProps }, forwardedRef) => {
    const internalRef = useRef<TextInput>(null);
    
    // Usar ref interno o el forwarded ref
    const inputRef = (forwardedRef as React.RefObject<TextInput>) || internalRef;

    const handleFocus = (e: any) => {
      // Llamar al onFocus original si existe
      if (onFocus) {
        onFocus(e);
      }

      // Si no hay scrollViewRef, no hacer nada más
      if (!scrollViewRef?.current || !inputRef.current) {
        return;
      }

      // Esperar a que el teclado esté visible
      const keyboardTimeout = setTimeout(() => {
        const screenHeight = Dimensions.get('window').height;
        const keyboardHeight = Platform.OS === 'ios' ? 350 : 310;
        
        // Usar measureInWindow para obtener la posición actual en la ventana
        inputRef.current?.measureInWindow((x: number, windowY: number, width: number, height: number) => {
          const inputBottom = windowY + height;
          const visibleBottom = screenHeight - keyboardHeight;
          const margin = 80;
          
          console.log('[SmartTextInput] Window position:', {
            windowY,
            inputBottom,
            visibleBottom,
            needsScroll: inputBottom > (visibleBottom - margin)
          });
          
          // Solo scrollear si está tapado
          if (inputBottom > visibleBottom - margin) {
            // Calcular cuánto hay que scrollear EXTRA
            const scrollOffset = inputBottom - (visibleBottom - margin);
            
            // Usar scrollResponderScrollNativeHandleToKeyboard si está disponible
            const scrollResponder = (scrollViewRef.current as any).getScrollResponder?.();
            if (scrollResponder?.scrollResponderScrollNativeHandleToKeyboard) {
              const inputHandle = inputRef.current as any;
              scrollResponder.scrollResponderScrollNativeHandleToKeyboard(
                inputHandle,
                margin, // additionalOffset
                true // preventNegativeScrollOffset
              );
              console.log('[SmartTextInput] Using scrollResponderScrollNativeHandleToKeyboard');
            } else {
              // Fallback: usar scrollToEnd no, mejor no hacer nada
              console.log('[SmartTextInput] ScrollResponder not available, skipping scroll');
            }
          }
        });
      }, 350);

      return () => clearTimeout(keyboardTimeout);
    };

    return (
      <TextInput
        ref={inputRef}
        onFocus={handleFocus}
        {...textInputProps}
      />
    );
  }
);

SmartTextInput.displayName = 'SmartTextInput';
