import React from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { PRIVACY_POLICY_URL } from '../../constants/links';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function PolicyWebModal({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
      <WebView source={{ uri: PRIVACY_POLICY_URL }} style={styles.webview} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { height: 56, justifyContent: 'center', paddingHorizontal: 12, backgroundColor: '#fff' },
  closeBtn: { padding: 8 },
  closeText: { color: '#0366d6', fontWeight: '600' },
  webview: { flex: 1 },
});
