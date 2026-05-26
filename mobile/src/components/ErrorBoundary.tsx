import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface Props { children?: React.ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>⚠️</Text>
          </View>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message} selectable>{this.state.error.message}</Text>
          <Pressable style={styles.retryBtn} onPress={() => this.setState({ error: null })}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
          <Text style={styles.stackLabel}>Error details:</Text>
          <Text style={styles.stack} selectable>{this.state.error.stack}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: { marginBottom: 16 },
  icon: { fontSize: 48 },
  title: { color: '#0f172a', fontSize: 22, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  message: { color: '#475569', fontSize: 15, marginBottom: 20, textAlign: 'center', lineHeight: 22 },
  retryBtn: {
    backgroundColor: '#1b4d8d',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  retryText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  stackLabel: { color: '#64748b', fontSize: 12, fontWeight: '600', alignSelf: 'flex-start', marginBottom: 4 },
  stack: { color: '#94a3b8', fontSize: 11, lineHeight: 16, alignSelf: 'flex-start' },
});
