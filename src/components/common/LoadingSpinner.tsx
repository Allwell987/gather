// src/components/common/LoadingSpinner.tsx
import React from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { BaseColors } from '../../constants/theme';

export interface LoadingSpinnerProps {
  color?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

export default function LoadingSpinner({
  color = BaseColors.sapphire,
  size = 'large',
  fullScreen = false,
}: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <View style={styles.fullScreen}>
        <ActivityIndicator size={size} color={color} />
      </View>
    );
  }

  return <ActivityIndicator size={size} color={color} />;
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BaseColors.white,
  },
});
