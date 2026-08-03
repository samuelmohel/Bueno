import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { Loader } from '../src/components/ui/Loader';
import { View } from 'react-native';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <View style={{ flex: 1 }}><Loader full /></View>;
  return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/login'} />;
}
