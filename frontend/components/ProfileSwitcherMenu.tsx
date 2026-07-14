import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { Avatar, Divider, Menu, useTheme } from 'react-native-paper';
import { useAccessContext } from '../contexts/AccessContext';

const initialsFor = (label: string) => label.trim().charAt(0).toUpperCase() || '?';

export default function ProfileSwitcherMenu() {
  const router = useRouter();
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const { delegatedOwner, isDelegated, myProfiles, setDelegatedOwner } = useAccessContext();

  const activeLabel = myProfiles.find((profile) => profile.owner === delegatedOwner)?.label ?? 'My Account';

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <Pressable onPress={() => setVisible(true)} style={{ marginRight: 12 }}>
          <Avatar.Text
            size={32}
            label={initialsFor(activeLabel)}
            style={{
              backgroundColor: isDelegated ? theme.colors.tertiaryContainer : theme.colors.primaryContainer,
            }}
            color={isDelegated ? theme.colors.onTertiaryContainer : theme.colors.onPrimaryContainer}
          />
        </Pressable>
      }
    >
      {myProfiles.map((profile) => (
        <Menu.Item
          key={profile.owner}
          title={profile.owner === delegatedOwner ? `✓ ${profile.label}` : profile.label}
          onPress={() => {
            setDelegatedOwner(profile.owner);
            setVisible(false);
          }}
        />
      ))}
      <Divider />
      <Menu.Item
        title="Manage Access"
        onPress={() => {
          setVisible(false);
          router.push('/account-access');
        }}
      />
    </Menu>
  );
}
