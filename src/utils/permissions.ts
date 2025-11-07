export type UserRole = 'admin' | 'hr_manager' | 'recruiter' | 'employee' | 'auditor';

export interface Permission {
  viewCandidates: boolean;
  editCandidates: boolean;
  viewJobPostings: boolean;
  editJobPostings: boolean;
  viewScreeningResults: boolean;
  viewAuditLogs: boolean;
  viewComplianceReports: boolean;
  manageOnboarding: boolean;
}

const rolePermissions: Record<UserRole, Permission> = {
  admin: {
    viewCandidates: true,
    editCandidates: true,
    viewJobPostings: true,
    editJobPostings: true,
    viewScreeningResults: true,
    viewAuditLogs: true,
    viewComplianceReports: true,
    manageOnboarding: true,
  },
  hr_manager: {
    viewCandidates: true,
    editCandidates: true,
    viewJobPostings: true,
    editJobPostings: true,
    viewScreeningResults: true,
    viewAuditLogs: true,
    viewComplianceReports: true,
    manageOnboarding: true,
  },
  recruiter: {
    viewCandidates: true,
    editCandidates: true,
    viewJobPostings: true,
    editJobPostings: true,
    viewScreeningResults: true,
    viewAuditLogs: false,
    viewComplianceReports: false,
    manageOnboarding: false,
  },
  auditor: {
    viewCandidates: true,
    editCandidates: false,
    viewJobPostings: true,
    editJobPostings: false,
    viewScreeningResults: true,
    viewAuditLogs: true,
    viewComplianceReports: true,
    manageOnboarding: false,
  },
  employee: {
    viewCandidates: false,
    editCandidates: false,
    viewJobPostings: true,
    editJobPostings: false,
    viewScreeningResults: false,
    viewAuditLogs: false,
    viewComplianceReports: false,
    manageOnboarding: false,
  },
};

export const getPermissions = (role?: UserRole): Permission => {
  if (!role) return rolePermissions.employee;
  return rolePermissions[role] || rolePermissions.employee;
};

export const hasPermission = (role: UserRole | undefined, permission: keyof Permission): boolean => {
  const permissions = getPermissions(role);
  return permissions[permission];
};
