import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Divider,
  HelperText,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme
} from "react-native-paper";
import { spacing } from "../config/theme";
import {
  useCreateInvite,
  useGrantedByMe,
  useGrantedToMe,
  useLeaveAccess,
  useRevokeAccess
} from "../hooks/useAccountAccess";
import { AccessRole, AccessStatus, AccountAccess } from "../types/accountAccess";

function SectionTitle({ children }: { children: string }) {
  return (
    <Text variant="titleMedium" style={styles.sectionTitle}>
      {children}
    </Text>
  );
}

export default function AccountAccessScreen() {
  const theme = useTheme();

  const { data: grantedToMe, isLoading: isGrantedToMeLoading } = useGrantedToMe();
  const { data: grantedByMe, isLoading: isGrantedByMeLoading } = useGrantedByMe();

  const leaveMutation = useLeaveAccess();
  const revokeMutation = useRevokeAccess();
  const createInviteMutation = useCreateInvite();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AccessRole>(AccessRole.COLLABORATOR);

  const sharedWithMe = (grantedToMe ?? []).filter((grant) => grant.status === AccessStatus.ACCEPTED);
  const activeStatuses: AccessStatus[] = [AccessStatus.PENDING, AccessStatus.ACCEPTED];

  const handleInvite = () => {
    if (!email.trim()) return;
    createInviteMutation.mutate(
      { email: email.trim(), role },
      { onSuccess: () => setEmail("") }
    );
  };

  const inviteErrorMessage =
    createInviteMutation.isError && (createInviteMutation.error as any)?.response?.status === 404
      ? "No user found with that email"
      : createInviteMutation.isError
      ? "Failed to send invite"
      : undefined;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SectionTitle>Shared with me</SectionTitle>
      {isGrantedToMeLoading ? (
        <ActivityIndicator style={styles.loader} />
      ) : sharedWithMe.length === 0 ? (
        <Text style={styles.emptyText}>No accounts shared with you yet</Text>
      ) : (
        sharedWithMe.map((grant) => (
          <View key={grant.id} style={styles.row}>
            <View style={styles.rowInfo}>
              <Text variant="bodyLarge">{grant.ownerName ?? grant.owner}</Text>
              <Text variant="bodySmall" style={styles.rowSubtext}>{grant.role}</Text>
            </View>
            <Button
              mode="text"
              textColor={theme.colors.error}
              onPress={() => leaveMutation.mutate(grant.id)}
              loading={leaveMutation.isPending}
            >
              Leave
            </Button>
          </View>
        ))
      )}

      <Divider style={styles.divider} />

      <SectionTitle>People I&apos;ve shared with</SectionTitle>
      <View style={styles.inviteForm}>
        <TextInput
          mode="outlined"
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.emailInput}
        />
        <SegmentedButtons
          value={role}
          onValueChange={(value) => setRole(value as AccessRole)}
          style={styles.segmented}
          buttons={[
            { value: AccessRole.COLLABORATOR, label: "Collaborator" },
            { value: AccessRole.READ, label: "Read only" },
          ]}
        />
        {inviteErrorMessage && <HelperText type="error">{inviteErrorMessage}</HelperText>}
        <Button
          mode="contained"
          onPress={handleInvite}
          loading={createInviteMutation.isPending}
          disabled={!email.trim()}
        >
          Send Invite
        </Button>
      </View>

      {isGrantedByMeLoading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (grantedByMe ?? []).length === 0 ? (
        <Text style={styles.emptyText}>You haven&apos;t shared your account with anyone</Text>
      ) : (
        (grantedByMe ?? []).map((grant: AccountAccess) => (
          <View key={grant.id} style={styles.row}>
            <View style={styles.rowInfo}>
              <Text variant="bodyLarge">{grant.delegate}</Text>
              <Text variant="bodySmall" style={styles.rowSubtext}>
                {grant.role} · {grant.status}
              </Text>
            </View>
            {activeStatuses.includes(grant.status) && (
              <Button
                mode="text"
                textColor={theme.colors.error}
                onPress={() => revokeMutation.mutate(grant.id)}
                loading={revokeMutation.isPending}
              >
                Revoke
              </Button>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  loader: {
    marginVertical: spacing.lg,
  },
  emptyText: {
    color: "#999",
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  rowInfo: {
    flex: 1,
  },
  rowSubtext: {
    color: "#999",
  },
  divider: {
    marginVertical: spacing.lg,
  },
  inviteForm: {
    marginBottom: spacing.lg,
  },
  emailInput: {
    marginBottom: spacing.md,
  },
  segmented: {
    marginBottom: spacing.md,
  },
});
