export enum AccessRole {
  COLLABORATOR = 'COLLABORATOR',
  READ = 'READ'
}

export enum AccessStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  REVOKED = 'REVOKED'
}

export interface AccountAccess {
  id: string;
  owner: string;
  delegate: string;
  role: AccessRole;
  status: AccessStatus;
  createdAt: string;
  respondedAt?: string;
  ownerName?: string;
  ownerPictureUrl?: string;
}

export interface CreateAccountAccessRequest {
  email: string;
  role: AccessRole;
}
