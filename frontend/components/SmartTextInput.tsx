import React, { useRef, useEffect } from 'react';
import { TextInput, TextInputProps, findNodeHandle, ScrollView, Keyboard } from 'react-native';

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
        inputRef.current?.measureLayout(
          findNodeHandle(scrollViewRef.current) as any,
          (x, y, width, height) => {
            // Calcular la posición de scroll ideal
            // Restamos el padding extra para asegurar que el input quede bien visible
            const scrollY = Math.max(0, y - extraScrollPadding);
            
            scrollViewRef.current?.scrollTo({
              y: scrollY,
              animated: true,
            });
          },
          () => {
            console.warn('[SmartTextInput] Error measuring input layout');
          }
        );
      }, 150); // Delay para esperar animación del teclado

      // Cleanup
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
