import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Snackbar } from 'react-native-paper';
import { setAccessRevokedHandler, setDelegatedOwnerHeader } from '../config/api';
import {
  clearStoredDelegatedOwner,
  getStoredDelegatedOwner,
  setStoredDelegatedOwner
} from '../config/delegatedOwnerStorage';
import { queryClient } from '../config/queryClient';
import { AccessRole, AccessStatus } from '../types/accountAccess';
import { useGrantedToMe } from '../hooks/useAccountAccess';
import { useUser } from './UserContext';

export interface DelegatedProfile {
  owner: string;
  label: string;
  role: AccessRole | null; // null = full access to your own account
  pictureUrl?: string;
}

interface AccessContextType {
  delegatedOwner: string;
  isDelegated: boolean;
  activeRole: AccessRole | null;
  myProfiles: DelegatedProfile[];
  setDelegatedOwner: (owner: string) => void;
}

const AccessContext = createContext<AccessContextType | undefined>(undefined);

export const AccessProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const selfOwner = user?.owner ?? '';
  const { data: grantedToMe } = useGrantedToMe();

  const [delegatedOwner, setDelegatedOwnerState] = useState('');
  const [hasLoadedPersisted, setHasLoadedPersisted] = useState(false);
  const [revokedMessage, setRevokedMessage] = useState<string | null>(null);

  const myProfiles: DelegatedProfile[] = useMemo(() => {
    if (!selfOwner) return [];
    const accepted = (grantedToMe ?? []).filter((grant) => grant.status === AccessStatus.ACCEPTED);
    return [
      { owner: selfOwner, label: 'My Account', role: null },
      ...accepted.map((grant) => ({
        owner: grant.owner,
        label: grant.ownerName ?? grant.owner,
        role: grant.role,
        pictureUrl: grant.ownerPictureUrl,
      })),
    ];
  }, [selfOwner, grantedToMe]);

  const applyDelegatedOwner = (owner: string) => {
    setDelegatedOwnerState(owner);
    setDelegatedOwnerHeader(owner && owner !== selfOwner ? owner : null);
  };

  // Resolve persisted profile once we know who "self" is
  useEffect(() => {
    if (!selfOwner || hasLoadedPersisted) return;

    getStoredDelegatedOwner().then((stored) => {
      applyDelegatedOwner(stored ?? selfOwner);
      setHasLoadedPersisted(true);
    });
  }, [selfOwner, hasLoadedPersisted]);

  // If the persisted profile is no longer an accepted grant (revoked while signed out), fall back to self
  useEffect(() => {
    if (!hasLoadedPersisted || !delegatedOwner || delegatedOwner === selfOwner) return;
    if (myProfiles.some((profile) => profile.owner === delegatedOwner)) return;

    applyDelegatedOwner(selfOwner);
    clearStoredDelegatedOwner();
  }, [hasLoadedPersisted, myProfiles, delegatedOwner, selfOwner]);

  useEffect(() => {
    setAccessRevokedHandler(() => {
      applyDelegatedOwner(selfOwner);
      clearStoredDelegatedOwner();
      queryClient.clear();
      setRevokedMessage('Access to this account was removed');
    });
    return () => setAccessRevokedHandler(null);
  }, [selfOwner]);

  const setDelegatedOwner = (owner: string) => {
    applyDelegatedOwner(owner);
    if (owner === selfOwner) {
      clearStoredDelegatedOwner();
    } else {
      setStoredDelegatedOwner(owner);
    }
    queryClient.clear();
  };

  const activeRole = myProfiles.find((profile) => profile.owner === delegatedOwner)?.role ?? null;

  const value: AccessContextType = {
    delegatedOwner: delegatedOwner || selfOwner,
    isDelegated: !!delegatedOwner && delegatedOwner !== selfOwner,
    activeRole,
    myProfiles,
    setDelegatedOwner,
  };

  return (
    <AccessContext.Provider value={value}>
      {children}
      <Snackbar
        visible={!!revokedMessage}
        onDismiss={() => setRevokedMessage(null)}
        duration={4000}
      >
        {revokedMessage}
      </Snackbar>
    </AccessContext.Provider>
  );
};

export const useAccessContext = (): AccessContextType => {
  const context = useContext(AccessContext);
  if (context === undefined) {
    throw new Error('useAccessContext must be used within an AccessProvider');
  }
  return context;
};
