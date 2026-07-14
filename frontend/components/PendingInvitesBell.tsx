import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Badge, IconButton } from 'react-native-paper';
import { usePendingInvites } from '../hooks/useAccountAccess';

export default function PendingInvitesBell() {
  const router = useRouter();
  const { data: pending } = usePendingInvites();
  const count = pending?.length ?? 0;

  return (
    <View>
      <IconButton icon="bell-outline" onPress={() => router.push('/account-access')} />
      {count > 0 && (
        <Badge size={16} style={{ position: 'absolute', top: 4, right: 4 }}>
          {count}
        </Badge>
      )}
    </View>
  );
}
