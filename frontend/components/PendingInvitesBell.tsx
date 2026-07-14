import React from 'react';
import { ScrollView, View } from 'react-native';
import { Badge, Button, Divider, IconButton, Menu, Text, useTheme } from 'react-native-paper';
import { spacing } from '../config/theme';
import { useAcceptInvite, usePendingInvites, useRejectInvite } from '../hooks/useAccountAccess';

interface PendingInvitesBellProps {
  visible: boolean;
  onOpen: () => void;
  onDismiss: () => void;
}

export default function PendingInvitesBell({ visible, onOpen, onDismiss }: PendingInvitesBellProps) {
  const theme = useTheme();
  const { data: pending } = usePendingInvites();
  const acceptMutation = useAcceptInvite();
  const rejectMutation = useRejectInvite();

  const invites = pending ?? [];
  const count = invites.length;

  return (
    <Menu
      visible={visible}
      onDismiss={onDismiss}
      anchor={
        <View>
          <IconButton icon="bell-outline" onPress={onOpen} />
          {count > 0 && (
            <Badge size={16} style={{ position: 'absolute', top: 4, right: 4 }}>
              {count}
            </Badge>
          )}
        </View>
      }
      contentStyle={{ minWidth: 280, maxWidth: 320 }}
    >
      <Text variant="titleSmall" style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
        Pending invites
      </Text>
      <Divider />
      {count === 0 ? (
        <Text style={{ padding: spacing.md, color: theme.colors.onSurfaceVariant }}>
          No pending invites
        </Text>
      ) : (
        <ScrollView style={{ maxHeight: 320 }}>
          {invites.map((grant) => (
            <View key={grant.id} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
              <Text variant="bodyMedium">{grant.ownerName ?? grant.owner}</Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.xs }}
              >
                {grant.role}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <Button
                  mode="text"
                  onPress={() => acceptMutation.mutate(grant.id)}
                  loading={acceptMutation.isPending && acceptMutation.variables === grant.id}
                >
                  Accept
                </Button>
                <Button
                  mode="text"
                  textColor={theme.colors.error}
                  onPress={() => rejectMutation.mutate(grant.id)}
                  loading={rejectMutation.isPending && rejectMutation.variables === grant.id}
                >
                  Reject
                </Button>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </Menu>
  );
}
