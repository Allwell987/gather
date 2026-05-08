import React from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import LottieView from 'lottie-react-native';
import { useThemeStore } from '../../store/themeStore';

interface LoadingOverlayProps {
  visible: boolean;
}

export default function LoadingOverlay({ visible }: LoadingOverlayProps) {
  const { colors } = useThemeStore();

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <LottieView
            source={require('../../../assets/animations/loader.json')}
            autoPlay
            loop
            style={styles.lottie}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 100,
    height: 100,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  lottie: {
    width: 60,
    height: 60,
  },
});
