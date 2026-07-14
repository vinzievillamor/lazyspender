import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { ActivityIndicator, Avatar, Divider, Menu, useTheme } from 'react-native-paper';
import { useAccessContext } from '../contexts/AccessContext';

const initialsFor = (label: string) => label.trim().charAt(0).toUpperCase() || '?';

interface ProfileSwitcherMenuProps {
  visible: boolean;
  onOpen: () => void;
  onDismiss: () => void;
}

export default function ProfileSwitcherMenu({ visible, onOpen, onDismiss }: ProfileSwitcherMenuProps) {
  const router = useRouter();
  const theme = useTheme();
  const { delegatedOwner, isDelegated, isSwitchingAccount, myProfiles, setDelegatedOwner } = useAccessContext();

  const activeLabel = myProfiles.find((profile) => profile.owner === delegatedOwner)?.label ?? 'My Account';

  return (
    <Menu
      visible={visible}
      onDismiss={onDismiss}
      anchor={
        <Pressable onPress={onOpen} style={{ marginRight: 12 }}>
          {isSwitchingAccount ? (
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDelegated ? theme.colors.tertiaryContainer : theme.colors.primaryContainer,
              }}
            >
              <ActivityIndicator
                size="small"
                color={isDelegated ? theme.colors.onTertiaryContainer : theme.colors.onPrimaryContainer}
              />
            </View>
          ) : (
            <Avatar.Text
              size={32}
              label={initialsFor(activeLabel)}
              style={{
                backgroundColor: isDelegated ? theme.colors.tertiaryContainer : theme.colors.primaryContainer,
              }}
              color={isDelegated ? theme.colors.onTertiaryContainer : theme.colors.onPrimaryContainer}
            />
          )}
        </Pressable>
      }
    >
      {myProfiles.map((profile) => (
        <Menu.Item
          key={profile.owner}
          title={profile.owner === delegatedOwner ? `✓ ${profile.label}` : profile.label}
          disabled={isSwitchingAccount}
          onPress={() => {
            setDelegatedOwner(profile.owner);
            onDismiss();
          }}
        />
      ))}
      <Divider />
      <Menu.Item
        title="Manage Access"
        onPress={() => {
          onDismiss();
          router.push('/account-access');
        }}
      />
    </Menu>
  );
}
