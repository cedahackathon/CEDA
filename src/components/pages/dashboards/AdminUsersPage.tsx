/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { auth } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';
import { AccountStatus, UserRole } from '../../../types/auth';
import { AdminLayout } from '../../admin/AdminLayout';
import {
  ADMIN_ROLE_CHANGE_NOTES,
  ADMIN_ROLE_LABELS,
  ADMIN_ROLE_ORDER,
  AttentionItem,
  ROLE_PERMISSIONS_MATRIX,
} from '../../../data/adminConfig';
import {
  AdminUserRecord,
  AuditActor,
  createUserByAdmin,
  fetchAllUsersFromFirestore,
  sendUserPasswordReset,
  updateUserProfileInFirestore,
  updateUserRoleInFirestore,
  updateUserStatusInFirestore,
} from '../../../services/adminUsersService';

type UsersTab = 'users' | 'roles' | 'pending';
type SortField = 'name' | 'joined';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 10;

const STATUS_META: Record<
  AccountStatus,
  { label: string; icon: string; badgeClass: string }
> = {
  ACTIVE: {
    label: 'Active',
    icon: 'check_circle',
    badgeClass: 'bg-emerald-50 text-[#1b5e20] border-emerald-200',
  },
  PENDING: {
    label: 'Pending',
    icon: 'schedule',
    badgeClass: 'bg-amber-50 text-[#854d0e] border-amber-200',
  },
  SUSPENDED: {
    label: 'Suspended',
    icon: 'pause_circle',
    badgeClass: 'bg-red-50 text-[#a02010] border-red-200',
  },
  DEACTIVATED: {
    label: 'Deactivated',
    icon: 'block',
    badgeClass: 'bg-[#f1ede8] text-[#5a413c] border-[#d6cbc5]',
  },
  LOCKED: {
    label: 'Suspended',
    icon: 'pause_circle',
    badgeClass: 'bg-red-50 text-[#a02010] border-red-200',
  },
};

const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  SUBMITTER: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  EVALUATOR: 'bg-amber-50 text-amber-800 border-amber-200',
  ADJUDICATOR: 'bg-purple-50 text-purple-800 border-purple-200',
  ADMIN: 'bg-red-50 text-[#a02010] border-red-200',
  STAKEHOLDER: 'bg-blue-50 text-blue-800 border-blue-200',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || 'UU';
}

function maskOmang(omang: string): string {
  const clean = omang.trim();
  if (!clean) return 'Not provided';
  if (clean.length <= 3) return `••••••${clean}`;
  return `••••••${clean.slice(-3)}`;
}

function formatPhone(phone: string): string {
  const clean = phone.trim();
  if (!clean) return 'Not provided';
  if (clean.startsWith('+267')) return clean;
  return `+267 ${clean}`;
}

function formatJoinedDate(iso: string): string {
  if (!iso) return 'Not recorded';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function escapeCsvCell(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

export const AdminUsersPage: React.FC = () => {
  const { setCurrentRoute, currentUser } = useAuth();

  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<UsersTab>('users');

  // Filters, sorting, pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'DEACTIVATED'>('ALL');
  const [sortField, setSortField] = useState<SortField>('joined');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Toasts
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<{ message: string; retryable: boolean } | null>(null);

  // Open menu / drawers / modals
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);
  const [detailsUser, setDetailsUser] = useState<AdminUserRecord | null>(null);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserRecord | null>(null);
  const [roleModalUser, setRoleModalUser] = useState<AdminUserRecord | null>(null);
  const [pendingActionModal, setPendingActionModal] = useState<{
    type: 'suspend' | 'deactivate';
    user: AdminUserRecord;
  } | null>(null);

  // Busy states
  const [isSavingAction, setIsSavingAction] = useState(false);

  // Add User Form State
  const [addFirstName, setAddFirstName] = useState('');
  const [addSurname, setAddSurname] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addRole, setAddRole] = useState<UserRole>('SUBMITTER');
  const [addOrganisation, setAddOrganisation] = useState('');
  const [addSendResetEmail, setAddSendResetEmail] = useState(true);
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [addSubmitError, setAddSubmitError] = useState<string | null>(null);

  // Edit User Form State
  const [editFirstName, setEditFirstName] = useState('');
  const [editSurname, setEditSurname] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editOrganisation, setEditOrganisation] = useState('');
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editSubmitError, setEditSubmitError] = useState<string | null>(null);

  // Change Role State
  const [selectedNewRole, setSelectedNewRole] = useState<UserRole>('SUBMITTER');

  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  const actor: AuditActor = useMemo(
    () => ({
      id: auth?.currentUser?.uid || currentUser?.id || 'admin',
      name:
        currentUser?.fullName ||
        currentUser?.displayName ||
        auth?.currentUser?.email ||
        'Administrator',
    }),
    [currentUser]
  );

  const showSuccess = useCallback((msg: string) => {
    setSuccessToast(msg);
    setErrorToast(null);
  }, []);

  const showError = useCallback((message: string, retryable = false) => {
    setErrorToast({ message, retryable });
  }, []);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorToast(null);
    try {
      const records = await fetchAllUsersFromFirestore();
      setUsers(records);
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : 'Unable to load users from Firestore. Verify Firebase Admin permissions.',
        true
      );
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Close menus/drawers/modals on Escape or outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuUserId(null);
        setDetailsUser(null);
        setIsAddDrawerOpen(false);
        setEditUser(null);
        setRoleModalUser(null);
        setPendingActionModal(null);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-user-menu-root="true"]')) {
        setOpenMenuUserId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Auto-dismiss success toast
  useEffect(() => {
    if (!successToast) return;
    const timer = setTimeout(() => setSuccessToast(null), 5000);
    return () => clearTimeout(timer);
  }, [successToast]);

  // Summary counts & guardrails
  const summary = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === 'ACTIVE').length;
    const pending = users.filter((u) => u.status === 'PENDING').length;
    const suspended = users.filter((u) => u.status === 'SUSPENDED').length;
    const activeAdmins = users.filter((u) => u.role === 'ADMIN' && u.status === 'ACTIVE').length;
    return { total, active, pending, suspended, activeAdmins };
  }, [users]);

  const pendingUsers = useMemo(
    () => users.filter((u) => u.status === 'PENDING'),
    [users]
  );

  const attentionItems: AttentionItem[] = useMemo(() => {
    if (summary.pending === 0) return [];
    return [
      {
        id: 'pending-accounts',
        icon: 'manage_accounts',
        tone: 'neutral',
        text: `${summary.pending} ${summary.pending === 1 ? 'account is' : 'accounts are'} waiting for approval`,
        actionLabel: 'Review',
        route: '/admin/users',
      },
    ];
  }, [summary.pending]);

  const getGuardrailReason = useCallback(
    (user: AdminUserRecord, action: 'demote' | 'suspend' | 'deactivate'): string | null => {
      const activeUid = auth?.currentUser?.uid;
      const isSelf = Boolean(
        (currentUser?.id && currentUser.id === user.id) || (activeUid && activeUid === user.id)
      );
      if (isSelf) {
        if (action === 'demote') return 'You cannot demote your own administrator role.';
        if (action === 'suspend') return 'You cannot suspend your own account.';
        return 'You cannot deactivate your own account.';
      }
      const isLastActiveAdmin =
        user.role === 'ADMIN' && user.status === 'ACTIVE' && summary.activeAdmins <= 1;
      if (isLastActiveAdmin) {
        return 'The last active Administrator cannot be removed or demoted.';
      }
      return null;
    },
    [currentUser?.id, summary.activeAdmins]
  );

  // Filtered and sorted rows
  const filteredAndSortedUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        u.organisation.toLowerCase().includes(q) ||
        u.omangOrPassport.toLowerCase().includes(q)
      );
    });

    filtered.sort((a, b) => {
      if (sortField === 'name') {
        const cmp = a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' });
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      const safeA = Number.isNaN(timeA) ? 0 : timeA;
      const safeB = Number.isNaN(timeB) ? 0 : timeB;
      return sortDirection === 'asc' ? safeA - safeB : safeB - safeA;
    });

    return filtered;
  }, [users, searchQuery, roleFilter, statusFilter, sortField, sortDirection]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedUsers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredAndSortedUsers.slice(start, start + PAGE_SIZE);
  }, [filteredAndSortedUsers, safePage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setCurrentPage(1);
  };

  const handleExportCsv = () => {
    const headers = [
      'Name',
      'Email',
      'Phone',
      'Organisation',
      'Role',
      'Status',
      'Email Verified',
      'Phone Verified',
      'Joined',
    ];
    const rows = filteredAndSortedUsers.map((u) => [
      escapeCsvCell(u.displayName),
      escapeCsvCell(u.email || 'Not provided'),
      escapeCsvCell(formatPhone(u.phone)),
      escapeCsvCell(u.organisation || 'Not provided'),
      escapeCsvCell(ADMIN_ROLE_LABELS[u.role]),
      escapeCsvCell(STATUS_META[u.status].label),
      escapeCsvCell(u.emailVerified ? 'Yes' : 'No'),
      escapeCsvCell(u.phoneVerified ? 'Yes' : 'No'),
      escapeCsvCell(formatJoinedDate(u.createdAt)),
    ]);

    const csvContent = [headers.map(escapeCsvCell).join(','), ...rows.map((r) => r.join(','))].join(
      '\n'
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ceda-users-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Add user drawer handlers
  const openAddDrawer = () => {
    setAddFirstName('');
    setAddSurname('');
    setAddEmail('');
    setAddPhone('');
    setAddRole('SUBMITTER');
    setAddOrganisation('');
    setAddSendResetEmail(true);
    setAddErrors({});
    setAddSubmitError(null);
    setIsAddDrawerOpen(true);
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!addFirstName.trim()) errs.firstName = 'First name is required.';
    if (!addSurname.trim()) errs.surname = 'Surname is required.';
    const cleanEmail = addEmail.trim();
    if (!cleanEmail) {
      errs.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errs.email = 'Enter a valid email address.';
    }
    const cleanPhoneDigits = addPhone.replace(/\D/g, '');
    if (cleanPhoneDigits && cleanPhoneDigits.length !== 8) {
      errs.phone = 'Enter an 8-digit Botswana mobile number.';
    }

    setAddErrors(errs);
    setAddSubmitError(null);
    if (Object.keys(errs).length > 0) return;

    setIsSavingAction(true);
    try {
      await createUserByAdmin(
        {
          firstName: addFirstName,
          surname: addSurname,
          email: cleanEmail,
          phone: cleanPhoneDigits,
          role: addRole,
          organisation: addOrganisation,
          sendPasswordSetupEmail: addSendResetEmail,
        },
        actor,
        users.map((u) => u.email).filter(Boolean)
      );
      setIsAddDrawerOpen(false);
      await loadUsers();
      showSuccess(
        addSendResetEmail
          ? `User created and password setup email sent to ${cleanEmail}.`
          : `User account created for ${addFirstName.trim()} ${addSurname.trim()}.`
      );
    } catch (err) {
      await loadUsers().catch(() => {
        // ignore secondary refresh errors
      });
      setAddSubmitError(err instanceof Error ? err.message : 'Unable to create user account.');
    } finally {
      setIsSavingAction(false);
    }
  };

  // Edit drawer handlers
  const openEditDrawer = (user: AdminUserRecord) => {
    setOpenMenuUserId(null);
    setEditUser(user);
    setEditFirstName(user.firstName || user.displayName.split(' ')[0] || '');
    setEditSurname(user.surname || user.displayName.split(' ').slice(1).join(' ') || '');
    setEditPhone(user.phone);
    setEditOrganisation(user.organisation);
    setEditErrors({});
    setEditSubmitError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;

    const errs: Record<string, string> = {};
    if (!editFirstName.trim()) errs.firstName = 'First name is required.';
    if (!editSurname.trim()) errs.surname = 'Surname is required.';
    const cleanPhoneDigits = editPhone.replace(/\D/g, '');
    if (cleanPhoneDigits && cleanPhoneDigits.length !== 8) {
      errs.phone = 'Enter an 8-digit Botswana mobile number.';
    }

    setEditErrors(errs);
    setEditSubmitError(null);
    if (Object.keys(errs).length > 0) return;

    setIsSavingAction(true);
    try {
      const updated = await updateUserProfileInFirestore(
        editUser,
        {
          firstName: editFirstName,
          surname: editSurname,
          phone: cleanPhoneDigits,
          organisation: editOrganisation,
        },
        actor
      );
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      if (detailsUser?.id === updated.id) setDetailsUser(updated);
      setEditUser(null);
      showSuccess(`Updated details for ${updated.displayName}.`);
    } catch (err) {
      setEditSubmitError(
        err instanceof Error ? err.message : 'Failed to update user details.'
      );
    } finally {
      setIsSavingAction(false);
    }
  };

  // Role modal handlers
  const openRoleModal = (user: AdminUserRecord) => {
    setOpenMenuUserId(null);
    setRoleModalUser(user);
    setSelectedNewRole(user.role);
  };

  const handleConfirmRoleChange = async () => {
    if (!roleModalUser || selectedNewRole === roleModalUser.role) return;
    if (selectedNewRole !== 'ADMIN') {
      const reason = getGuardrailReason(roleModalUser, 'demote');
      if (reason) {
        showError(reason, false);
        setRoleModalUser(null);
        return;
      }
    }

    setIsSavingAction(true);
    try {
      await updateUserRoleInFirestore(roleModalUser, selectedNewRole, actor);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === roleModalUser.id
            ? { ...u, role: selectedNewRole, updatedAt: new Date().toISOString() }
            : u
        )
      );
      if (detailsUser?.id === roleModalUser.id) {
        setDetailsUser({ ...detailsUser, role: selectedNewRole });
      }
      showSuccess(
        `Changed role for ${roleModalUser.displayName} to ${ADMIN_ROLE_LABELS[selectedNewRole]}.`
      );
      setRoleModalUser(null);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to change user role.', false);
    } finally {
      setIsSavingAction(false);
    }
  };

  // Status actions (Suspend, Deactivate, Reactivate, Approve, Reject)
  const handleStatusUpdate = async (
    user: AdminUserRecord,
    nextStatus: AccountStatus,
    auditAction: 'suspended' | 'reactivated' | 'deactivated' | 'approved' | 'rejected'
  ) => {
    setIsSavingAction(true);
    try {
      await updateUserStatusInFirestore(user, nextStatus, actor, auditAction);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? {
                ...u,
                status: nextStatus,
                emailVerified: auditAction === 'approved' ? true : u.emailVerified,
                phoneVerified: auditAction === 'approved' ? true : u.phoneVerified,
                updatedAt: new Date().toISOString(),
              }
            : u
        )
      );
      if (detailsUser?.id === user.id) {
        setDetailsUser({ ...detailsUser, status: nextStatus });
      }
      const actionWords: Record<typeof auditAction, string> = {
        suspended: 'suspended',
        reactivated: 'reactivated',
        deactivated: 'deactivated',
        approved: 'approved',
        rejected: 'rejected',
      };
      showSuccess(`${user.displayName} has been ${actionWords[auditAction]}.`);
      setPendingActionModal(null);
    } catch (err) {
      setPendingActionModal(null);
      showError(
        err instanceof Error ? err.message : `Failed to update status for ${user.displayName}.`,
        false
      );
    } finally {
      setIsSavingAction(false);
    }
  };

  const handlePasswordReset = async (user: AdminUserRecord, isResendInvite: boolean) => {
    setOpenMenuUserId(null);
    setIsSavingAction(true);
    try {
      await sendUserPasswordReset(user, actor, isResendInvite);
      showSuccess(
        isResendInvite
          ? `Invitation setup email sent via Firebase Auth to ${user.email.trim()}. Ask the user to check Inbox and Spam.`
          : `Password reset email sent via Firebase Auth to ${user.email.trim()}. Ask the user to check Inbox and Spam.`
      );
    } catch (err) {
      showError(
        err instanceof Error ? err.message : 'Unable to send password reset email.',
        false
      );
    } finally {
      setIsSavingAction(false);
    }
  };

  return (
    <AdminLayout
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      attentionItems={attentionItems}
    >
      <div className="flex flex-col gap-5" ref={menuContainerRef}>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#6b4f47]">
          <button
            type="button"
            onClick={() => setCurrentRoute('/')}
            className="hover:text-[#a02010] transition-colors"
          >
            Home
          </button>
          <span aria-hidden="true">/</span>
          <button
            type="button"
            onClick={() => setCurrentRoute('/admin')}
            className="hover:text-[#a02010] transition-colors"
          >
            Administration
          </button>
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-[#1c1c19]">Users and roles</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-headline text-2xl sm:text-[28px] font-bold text-[#38231d] tracking-tight leading-tight">
              Users and roles
            </h1>
            <p className="text-xs sm:text-[13px] text-[#6b4f47] mt-1">
              Manage portal accounts, role permissions, and pending approvals.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadUsers}
              disabled={isLoading}
              aria-label="Refresh users"
              title="Refresh users"
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-[#38231d] transition-colors disabled:opacity-50 cursor-pointer shrink-0"
            >
              <span
                className={`material-symbols-outlined text-[18px] ${
                  isLoading ? 'animate-spin' : ''
                }`}
              >
                refresh
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isLoading || filteredAndSortedUsers.length === 0}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-xs font-semibold text-[#38231d] transition-colors disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px]">download</span>
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={openAddDrawer}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px]">person_add</span>
              <span>Add user</span>
            </button>
          </div>
        </div>

        {/* Tabs under header */}
        <div
          role="tablist"
          aria-label="Users and roles sections"
          className="flex items-center gap-1 border-b border-[#e2bfb8]/80 overflow-x-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'users'}
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 text-xs sm:text-[13px] font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
              activeTab === 'users'
                ? 'border-[#a02010] text-[#a02010]'
                : 'border-transparent text-[#6b4f47] hover:text-[#1c1c19]'
            }`}
          >
            Users
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'roles'}
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2.5 text-xs sm:text-[13px] font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
              activeTab === 'roles'
                ? 'border-[#a02010] text-[#a02010]'
                : 'border-transparent text-[#6b4f47] hover:text-[#1c1c19]'
            }`}
          >
            Roles and permissions
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pending'}
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2.5 text-xs sm:text-[13px] font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'pending'
                ? 'border-[#a02010] text-[#a02010]'
                : 'border-transparent text-[#6b4f47] hover:text-[#1c1c19]'
            }`}
          >
            <span>Pending approvals</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
                summary.pending > 0
                  ? 'bg-[#ffdad6] text-[#a02010]'
                  : 'bg-[#f1ede8] text-[#5a413c]'
              }`}
            >
              {summary.pending}
            </span>
          </button>
        </div>

        {/* Stat Cards (computed from data) */}
        <section
          aria-label="User summary counts"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        >
          <div className="bg-white rounded-xl border border-[#e2bfb8]/80 p-4 shadow-xs">
            <div className="font-headline text-2xl font-bold text-[#38231d] tabular-nums">
              {isLoading ? '—' : summary.total}
            </div>
            <div className="text-xs text-[#6b4f47] mt-1 font-medium">Registered users</div>
          </div>

          <div className="bg-white rounded-xl border border-[#e2bfb8]/80 p-4 shadow-xs">
            <div className="font-headline text-2xl font-bold text-[#1b5e20] tabular-nums">
              {isLoading ? '—' : summary.active}
            </div>
            <div className="text-xs text-[#6b4f47] mt-1 font-medium">Active</div>
          </div>

          <div className="bg-white rounded-xl border border-[#e2bfb8]/80 p-4 shadow-xs">
            <div
              className={`font-headline text-2xl font-bold tabular-nums ${
                summary.pending > 0 ? 'text-[#854d0e]' : 'text-[#38231d]'
              }`}
            >
              {isLoading ? '—' : summary.pending}
            </div>
            <div className="text-xs text-[#6b4f47] mt-1 font-medium">Pending approval</div>
          </div>

          <div className="bg-white rounded-xl border border-[#e2bfb8]/80 p-4 shadow-xs">
            <div
              className={`font-headline text-2xl font-bold tabular-nums ${
                summary.suspended > 0 ? 'text-[#a02010]' : 'text-[#38231d]'
              }`}
            >
              {isLoading ? '—' : summary.suspended}
            </div>
            <div className="text-xs text-[#6b4f47] mt-1 font-medium">Suspended</div>
          </div>
        </section>

        {/* TAB 1: USERS */}
        {activeTab === 'users' && (
          <>
            {/* Search and Filters */}
            <section
              aria-label="Filter users"
              className="bg-white rounded-xl border border-[#e2bfb8]/80 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3"
            >
              <div className="relative flex-1">
                <label htmlFor="users-filter-search" className="sr-only">
                  Search users by name, email, phone, or organisation
                </label>
                <span className="material-symbols-outlined text-[18px] text-[#77574e] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  search
                </span>
                <input
                  id="users-filter-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, phone, or organisation..."
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#fdf9f4] focus:bg-white border border-[#e2bfb8]/70 focus:border-[#a02010] text-xs font-medium text-[#1c1c19]"
                />
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
                <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                  <label htmlFor="users-role-filter" className="text-xs font-semibold text-[#6b4f47]">
                    Role
                  </label>
                  <select
                    id="users-role-filter"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as 'ALL' | UserRole)}
                    className="h-10 px-3 rounded-lg bg-[#fdf9f4] border border-[#e2bfb8]/70 text-xs font-medium text-[#1c1c19] w-full sm:w-auto"
                  >
                    <option value="ALL">All roles</option>
                    {ADMIN_ROLE_ORDER.map((role) => (
                      <option key={role} value={role}>
                        {ADMIN_ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                  <label htmlFor="users-status-filter" className="text-xs font-semibold text-[#6b4f47]">
                    Status
                  </label>
                  <select
                    id="users-status-filter"
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(
                        e.target.value as 'ALL' | 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'DEACTIVATED'
                      )
                    }
                    className="h-10 px-3 rounded-lg bg-[#fdf9f4] border border-[#e2bfb8]/70 text-xs font-medium text-[#1c1c19] w-full sm:w-auto"
                  >
                    <option value="ALL">All statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PENDING">Pending</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="DEACTIVATED">Deactivated</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Directory Table / Cards */}
            <section
              aria-labelledby="users-directory-heading"
              className="bg-white rounded-xl border border-[#e2bfb8]/80 shadow-xs overflow-visible"
            >
              <div className="px-5 py-4 border-b border-[#f1ede8] flex items-center justify-between gap-2">
                <h2
                  id="users-directory-heading"
                  className="font-headline text-sm sm:text-base font-bold text-[#38231d]"
                >
                  User directory
                </h2>
                <span className="text-xs text-[#6b4f47] tabular-nums">
                  {filteredAndSortedUsers.length}{' '}
                  {filteredAndSortedUsers.length === 1 ? 'user' : 'users'}
                </span>
              </div>

              {isLoading ? (
                /* Loading Skeleton Rows */
                <div aria-busy="true" aria-label="Loading users">
                  <div className="hidden md:block divide-y divide-[#f1ede8]">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <div key={idx} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                        <div className="w-9 h-9 rounded-full bg-[#ebe8e3] shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 w-44 rounded bg-[#ebe8e3]" />
                          <div className="h-2.5 w-60 rounded bg-[#f1ede8]" />
                        </div>
                        <div className="h-6 w-24 rounded-full bg-[#ebe8e3]" />
                        <div className="h-6 w-20 rounded-full bg-[#ebe8e3]" />
                        <div className="h-3.5 w-20 rounded bg-[#f1ede8]" />
                        <div className="h-8 w-20 rounded-lg bg-[#ebe8e3]" />
                      </div>
                    ))}
                  </div>
                  <div className="md:hidden divide-y divide-[#f1ede8]">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div key={idx} className="p-4 space-y-3 animate-pulse">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#ebe8e3]" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3.5 w-36 rounded bg-[#ebe8e3]" />
                            <div className="h-2.5 w-48 rounded bg-[#f1ede8]" />
                          </div>
                        </div>
                        <div className="h-12 rounded-lg bg-[#f1ede8]" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : filteredAndSortedUsers.length === 0 ? (
                /* Empty State */
                <div className="p-10 text-center flex flex-col items-center gap-2.5">
                  <div className="w-12 h-12 rounded-full bg-[#f7f3ee] text-[#6b4f47] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">group_off</span>
                  </div>
                  <p className="text-sm font-bold text-[#1c1c19]">No users match your filters</p>
                  <p className="text-xs text-[#6b4f47] max-w-md">
                    {users.length === 0
                      ? 'No user records are stored yet. Use Add user to create an account.'
                      : 'Adjust your search terms or clear active role and status filters.'}
                  </p>
                  {(searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-1 h-9 px-4 rounded-lg border border-[#e2bfb8] bg-[#fdf9f4] hover:bg-[#f1ede8] text-xs font-semibold text-[#38231d] transition-colors cursor-pointer"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#fdf9f4] border-b border-[#e2bfb8]/60 text-[11px] font-bold uppercase tracking-wider text-[#6b4f47]">
                          <th
                            className="py-3 px-5"
                            aria-sort={
                              sortField === 'name'
                                ? sortDirection === 'asc'
                                  ? 'ascending'
                                  : 'descending'
                                : 'none'
                            }
                          >
                            <button
                              type="button"
                              onClick={() => handleSort('name')}
                              className="inline-flex items-center gap-1 hover:text-[#1c1c19] cursor-pointer uppercase"
                            >
                              <span>Name</span>
                              <span className="material-symbols-outlined text-[15px]">
                                {sortField === 'name'
                                  ? sortDirection === 'asc'
                                    ? 'arrow_upward'
                                    : 'arrow_downward'
                                  : 'unfold_more'}
                              </span>
                            </button>
                          </th>
                          <th className="py-3 px-4">Contact &amp; Identity</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Status</th>
                          <th
                            className="py-3 px-4"
                            aria-sort={
                              sortField === 'joined'
                                ? sortDirection === 'asc'
                                  ? 'ascending'
                                  : 'descending'
                                : 'none'
                            }
                          >
                            <button
                              type="button"
                              onClick={() => handleSort('joined')}
                              className="inline-flex items-center gap-1 hover:text-[#1c1c19] cursor-pointer uppercase"
                            >
                              <span>Joined</span>
                              <span className="material-symbols-outlined text-[15px]">
                                {sortField === 'joined'
                                  ? sortDirection === 'asc'
                                    ? 'arrow_upward'
                                    : 'arrow_downward'
                                  : 'unfold_more'}
                              </span>
                            </button>
                          </th>
                          <th className="py-3 px-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f1ede8] text-xs">
                        {paginatedUsers.map((user) => {
                          const statusMeta = STATUS_META[user.status] || STATUS_META.ACTIVE;
                          const isSelf = Boolean(currentUser?.id && currentUser.id === user.id);
                          const neverSignedIn = !user.lastLoginAt;
                          const demoteGuard = getGuardrailReason(user, 'demote');
                          const suspendGuard = getGuardrailReason(user, 'suspend');
                          const deactivateGuard = getGuardrailReason(user, 'deactivate');

                          return (
                            <tr
                              key={user.id}
                              onClick={() => setDetailsUser(user)}
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setDetailsUser(user);
                                }
                              }}
                              className="hover:bg-[#fdf9f4]/80 transition-colors cursor-pointer"
                            >
                              <td className="py-3.5 px-5">
                                <div className="flex items-center gap-3">
                                  <span
                                    aria-hidden="true"
                                    className="w-9 h-9 rounded-full bg-[#a02010] text-white font-bold text-xs flex items-center justify-center shrink-0"
                                  >
                                    {getInitials(user.displayName)}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="font-bold text-[#1c1c19] flex items-center gap-1.5">
                                      <span className="truncate">{user.displayName}</span>
                                      {isSelf && (
                                        <span className="px-1.5 py-0.5 rounded bg-[#ffdad4] text-[#7c0700] text-[10px] font-bold">
                                          You
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-[#5a413c] flex items-center gap-1.5 mt-0.5">
                                      <span className="truncate">{user.email || 'Not provided'}</span>
                                      <span
                                        title={
                                          user.emailVerified
                                            ? 'Email verified'
                                            : 'Email not verified'
                                        }
                                        aria-label={
                                          user.emailVerified
                                            ? 'Email verified'
                                            : 'Email not verified'
                                        }
                                        className={`inline-flex items-center ${
                                          user.emailVerified ? 'text-[#1b5e20]' : 'text-[#8d706b]'
                                        }`}
                                      >
                                        <span className="material-symbols-outlined text-[14px]">
                                          {user.emailVerified ? 'mark_email_read' : 'mail'}
                                        </span>
                                      </span>
                                      <span
                                        title={
                                          user.phoneVerified
                                            ? 'Phone verified'
                                            : 'Phone not verified'
                                        }
                                        aria-label={
                                          user.phoneVerified
                                            ? 'Phone verified'
                                            : 'Phone not verified'
                                        }
                                        className={`inline-flex items-center ${
                                          user.phoneVerified ? 'text-[#1b5e20]' : 'text-[#8d706b]'
                                        }`}
                                      >
                                        <span className="material-symbols-outlined text-[14px]">
                                          {user.phoneVerified ? 'phonelink_ring' : 'phone_iphone'}
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="text-[#1c1c19] font-medium tabular-nums">
                                  {formatPhone(user.phone)}
                                </div>
                                <div className="text-[11px] text-[#6b4f47]">
                                  {user.organisation || 'Not provided'}
                                </div>
                                <div className="text-[11px] text-[#6b4f47] tabular-nums">
                                  Omang: {maskOmang(user.omangOrPassport)}
                                </div>
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${
                                    ROLE_BADGE_CLASSES[user.role]
                                  }`}
                                >
                                  {ADMIN_ROLE_LABELS[user.role]}
                                </span>
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${statusMeta.badgeClass}`}
                                >
                                  <span className="material-symbols-outlined text-[13px]">
                                    {statusMeta.icon}
                                  </span>
                                  <span>{statusMeta.label}</span>
                                </span>
                              </td>

                              <td className="py-3.5 px-4 text-[#5a413c] tabular-nums whitespace-nowrap">
                                {formatJoinedDate(user.createdAt)}
                              </td>

                              <td
                                className="py-3.5 px-5 text-right whitespace-nowrap"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="inline-flex items-center gap-1.5 relative" data-user-menu-root="true">
                                  <button
                                    type="button"
                                    onClick={() => openEditDrawer(user)}
                                    className="px-3 py-1.5 rounded-lg border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-[#38231d] text-xs font-semibold transition-colors cursor-pointer"
                                  >
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    aria-label={`More actions for ${user.displayName}`}
                                    aria-expanded={openMenuUserId === user.id}
                                    onClick={() =>
                                      setOpenMenuUserId((prev) => (prev === user.id ? null : user.id))
                                    }
                                    className="w-8 h-8 rounded-lg border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-[#5a413c] inline-flex items-center justify-center transition-colors cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">
                                      more_vert
                                    </span>
                                  </button>

                                  {openMenuUserId === user.id && (
                                    <div
                                      role="menu"
                                      className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-[#e2bfb8] py-1.5 z-50 text-left"
                                    >
                                      <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => {
                                          setOpenMenuUserId(null);
                                          setDetailsUser(user);
                                        }}
                                        className="w-full px-3.5 py-2 text-xs font-medium text-[#1c1c19] hover:bg-[#fdf9f4] flex items-center gap-2.5"
                                      >
                                        <span className="material-symbols-outlined text-[16px] text-[#6b4f47]">
                                          visibility
                                        </span>
                                        <span>View details</span>
                                      </button>

                                      <button
                                        type="button"
                                        role="menuitem"
                                        disabled={Boolean(demoteGuard)}
                                        title={demoteGuard || undefined}
                                        onClick={() => openRoleModal(user)}
                                        className="w-full px-3.5 py-2 text-xs font-medium text-[#1c1c19] hover:bg-[#fdf9f4] flex items-center gap-2.5 disabled:opacity-45 disabled:cursor-not-allowed"
                                      >
                                        <span className="material-symbols-outlined text-[16px] text-[#6b4f47]">
                                          manage_accounts
                                        </span>
                                        <span>Change role</span>
                                      </button>

                                      <button
                                        type="button"
                                        role="menuitem"
                                        disabled={isSavingAction || !user.email}
                                        title={!user.email ? 'No email address on record' : undefined}
                                        onClick={() => handlePasswordReset(user, false)}
                                        className="w-full px-3.5 py-2 text-xs font-medium text-[#1c1c19] hover:bg-[#fdf9f4] flex items-center gap-2.5 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                                      >
                                        <span className="material-symbols-outlined text-[16px] text-[#6b4f47]">
                                          lock_reset
                                        </span>
                                        <span>{isSavingAction ? 'Sending...' : 'Send password reset'}</span>
                                      </button>

                                      {neverSignedIn && (
                                        <button
                                          type="button"
                                          role="menuitem"
                                          onClick={() => handlePasswordReset(user, true)}
                                          className="w-full px-3.5 py-2 text-xs font-medium text-[#1c1c19] hover:bg-[#fdf9f4] flex items-center gap-2.5"
                                        >
                                          <span className="material-symbols-outlined text-[16px] text-[#6b4f47]">
                                            forward_to_inbox
                                          </span>
                                          <span>Resend invite</span>
                                        </button>
                                      )}

                                      <div className="my-1 border-t border-[#f1ede8]" />

                                      {user.status === 'SUSPENDED' || user.status === 'DEACTIVATED' ? (
                                        <button
                                          type="button"
                                          role="menuitem"
                                          onClick={() => {
                                            setOpenMenuUserId(null);
                                            handleStatusUpdate(user, 'ACTIVE', 'reactivated');
                                          }}
                                          className="w-full px-3.5 py-2 text-xs font-semibold text-[#1b5e20] hover:bg-emerald-50 flex items-center gap-2.5"
                                        >
                                          <span className="material-symbols-outlined text-[16px]">
                                            check_circle
                                          </span>
                                          <span>Reactivate</span>
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          role="menuitem"
                                          disabled={Boolean(suspendGuard)}
                                          title={suspendGuard || undefined}
                                          onClick={() => {
                                            setOpenMenuUserId(null);
                                            setPendingActionModal({ type: 'suspend', user });
                                          }}
                                          className="w-full px-3.5 py-2 text-xs font-semibold text-[#854d0e] hover:bg-amber-50 flex items-center gap-2.5 disabled:opacity-45 disabled:cursor-not-allowed"
                                        >
                                          <span className="material-symbols-outlined text-[16px]">
                                            pause_circle
                                          </span>
                                          <span>Suspend</span>
                                        </button>
                                      )}

                                      {user.status !== 'DEACTIVATED' && (
                                        <button
                                          type="button"
                                          role="menuitem"
                                          disabled={Boolean(deactivateGuard)}
                                          title={deactivateGuard || undefined}
                                          onClick={() => {
                                            setOpenMenuUserId(null);
                                            setPendingActionModal({ type: 'deactivate', user });
                                          }}
                                          className="w-full px-3.5 py-2 text-xs font-semibold text-[#a02010] hover:bg-red-50 flex items-center gap-2.5 disabled:opacity-45 disabled:cursor-not-allowed"
                                        >
                                          <span className="material-symbols-outlined text-[16px]">
                                            block
                                          </span>
                                          <span>Deactivate</span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden divide-y divide-[#f1ede8]">
                    {paginatedUsers.map((user) => {
                      const statusMeta = STATUS_META[user.status] || STATUS_META.ACTIVE;
                      const isSelf = Boolean(currentUser?.id && currentUser.id === user.id);
                      const neverSignedIn = !user.lastLoginAt;
                      const demoteGuard = getGuardrailReason(user, 'demote');
                      const suspendGuard = getGuardrailReason(user, 'suspend');
                      const deactivateGuard = getGuardrailReason(user, 'deactivate');

                      return (
                        <div
                          key={user.id}
                          onClick={() => setDetailsUser(user)}
                          className="p-4 flex flex-col gap-3 cursor-pointer hover:bg-[#fdf9f4]/60"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                aria-hidden="true"
                                className="w-9 h-9 rounded-full bg-[#a02010] text-white font-bold text-xs flex items-center justify-center shrink-0"
                              >
                                {getInitials(user.displayName)}
                              </span>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-[#1c1c19] truncate">
                                  {user.displayName} {isSelf ? '(You)' : ''}
                                </div>
                                <div className="text-[11px] text-[#5a413c] truncate flex items-center gap-1">
                                  <span>{user.email || 'Not provided'}</span>
                                  <span
                                    title={user.emailVerified ? 'Email verified' : 'Email not verified'}
                                    className={`material-symbols-outlined text-[13px] ${
                                      user.emailVerified ? 'text-[#1b5e20]' : 'text-[#8d706b]'
                                    }`}
                                  >
                                    {user.emailVerified ? 'mark_email_read' : 'mail'}
                                  </span>
                                  <span
                                    title={user.phoneVerified ? 'Phone verified' : 'Phone not verified'}
                                    className={`material-symbols-outlined text-[13px] ${
                                      user.phoneVerified ? 'text-[#1b5e20]' : 'text-[#8d706b]'
                                    }`}
                                  >
                                    {user.phoneVerified ? 'phonelink_ring' : 'phone_iphone'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold shrink-0 ${statusMeta.badgeClass}`}
                            >
                              <span className="material-symbols-outlined text-[12px]">
                                {statusMeta.icon}
                              </span>
                              <span>{statusMeta.label}</span>
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] text-[#6b4f47] bg-[#fdf9f4] rounded-lg p-2.5 border border-[#e2bfb8]/40">
                            <div>
                              <span className="block text-[10px] uppercase tracking-wider">Role</span>
                              <span className="font-semibold text-[#1c1c19]">
                                {ADMIN_ROLE_LABELS[user.role]}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase tracking-wider">Phone</span>
                              <span className="font-semibold text-[#1c1c19] tabular-nums">
                                {formatPhone(user.phone)}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase tracking-wider">
                                Organisation
                              </span>
                              <span className="font-semibold text-[#1c1c19] truncate block">
                                {user.organisation || 'Not provided'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase tracking-wider">Joined</span>
                              <span className="font-semibold text-[#1c1c19] tabular-nums">
                                {formatJoinedDate(user.createdAt)}
                              </span>
                            </div>
                          </div>

                          <div
                            className="flex items-center justify-end gap-2 relative"
                            onClick={(e) => e.stopPropagation()}
                            data-user-menu-root="true"
                          >
                            <button
                              type="button"
                              onClick={() => openEditDrawer(user)}
                              className="h-9 px-3.5 rounded-lg border border-[#e2bfb8] bg-white text-xs font-semibold text-[#38231d]"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              aria-label={`Actions for ${user.displayName}`}
                              onClick={() =>
                                setOpenMenuUserId((prev) => (prev === user.id ? null : user.id))
                              }
                              className="h-9 px-3 rounded-lg border border-[#e2bfb8] bg-white text-xs font-semibold text-[#38231d] inline-flex items-center gap-1"
                            >
                              <span>Actions</span>
                              <span className="material-symbols-outlined text-[16px]">
                                more_vert
                              </span>
                            </button>

                            {openMenuUserId === user.id && (
                              <div
                                role="menu"
                                className="absolute right-0 bottom-full mb-1.5 w-52 bg-white rounded-xl shadow-xl border border-[#e2bfb8] py-1.5 z-50 text-left"
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setOpenMenuUserId(null);
                                    setDetailsUser(user);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-medium text-[#1c1c19] hover:bg-[#fdf9f4] flex items-center gap-2"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    visibility
                                  </span>
                                  <span>View details</span>
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  disabled={Boolean(demoteGuard)}
                                  onClick={() => openRoleModal(user)}
                                  className="w-full px-3.5 py-2 text-xs font-medium text-[#1c1c19] hover:bg-[#fdf9f4] flex items-center gap-2 disabled:opacity-45"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    manage_accounts
                                  </span>
                                  <span>Change role</span>
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  disabled={isSavingAction || !user.email}
                                  onClick={() => handlePasswordReset(user, false)}
                                  className="w-full px-3.5 py-2 text-xs font-medium text-[#1c1c19] hover:bg-[#fdf9f4] flex items-center gap-2 disabled:opacity-45 disabled:cursor-not-allowed"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    lock_reset
                                  </span>
                                  <span>{isSavingAction ? 'Sending...' : 'Send password reset'}</span>
                                </button>
                                {neverSignedIn && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => handlePasswordReset(user, true)}
                                    className="w-full px-3.5 py-2 text-xs font-medium text-[#1c1c19] hover:bg-[#fdf9f4] flex items-center gap-2"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      forward_to_inbox
                                    </span>
                                    <span>Resend invite</span>
                                  </button>
                                )}
                                {user.status === 'SUSPENDED' || user.status === 'DEACTIVATED' ? (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenMenuUserId(null);
                                      handleStatusUpdate(user, 'ACTIVE', 'reactivated');
                                    }}
                                    className="w-full px-3.5 py-2 text-xs font-semibold text-[#1b5e20] hover:bg-emerald-50 flex items-center gap-2"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      check_circle
                                    </span>
                                    <span>Reactivate</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    disabled={Boolean(suspendGuard)}
                                    onClick={() => {
                                      setOpenMenuUserId(null);
                                      setPendingActionModal({ type: 'suspend', user });
                                    }}
                                    className="w-full px-3.5 py-2 text-xs font-semibold text-[#854d0e] hover:bg-amber-50 flex items-center gap-2 disabled:opacity-45"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      pause_circle
                                    </span>
                                    <span>Suspend</span>
                                  </button>
                                )}
                                {user.status !== 'DEACTIVATED' && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    disabled={Boolean(deactivateGuard)}
                                    onClick={() => {
                                      setOpenMenuUserId(null);
                                      setPendingActionModal({ type: 'deactivate', user });
                                    }}
                                    className="w-full px-3.5 py-2 text-xs font-semibold text-[#a02010] hover:bg-red-50 flex items-center gap-2 disabled:opacity-45"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      block
                                    </span>
                                    <span>Deactivate</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Footer (10 rows per page) */}
                  <div className="px-5 py-3.5 border-t border-[#f1ede8] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6b4f47]">
                    <span className="tabular-nums">
                      Showing {(safePage - 1) * PAGE_SIZE + 1}–
                      {Math.min(safePage * PAGE_SIZE, filteredAndSortedUsers.length)} of{' '}
                      {filteredAndSortedUsers.length}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={safePage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="h-8 px-3 rounded-lg border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-xs font-semibold text-[#38231d] disabled:opacity-45 cursor-pointer"
                      >
                        Previous
                      </button>

                      {Array.from({ length: totalPages }).map((_, idx) => {
                        const pageNum = idx + 1;
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            aria-current={safePage === pageNum ? 'page' : undefined}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold tabular-nums transition-colors cursor-pointer ${
                              safePage === pageNum
                                ? 'bg-[#a02010] text-white'
                                : 'border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-[#38231d]'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        disabled={safePage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="h-8 px-3 rounded-lg border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-xs font-semibold text-[#38231d] disabled:opacity-45 cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          </>
        )}

        {/* TAB 2: ROLES AND PERMISSIONS */}
        {activeTab === 'roles' && (
          <section
            aria-labelledby="roles-matrix-heading"
            className="bg-white rounded-xl border border-[#e2bfb8]/80 shadow-xs overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-[#f1ede8] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2
                  id="roles-matrix-heading"
                  className="font-headline text-sm sm:text-base font-bold text-[#38231d]"
                >
                  Roles and permissions matrix
                </h2>
                <p className="text-xs text-[#6b4f47] mt-0.5">
                  Role changes are recorded in the audit trail.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#6b4f47] bg-[#fdf9f4] px-3 py-1.5 rounded-lg border border-[#e2bfb8]/60">
                <span className="material-symbols-outlined text-[15px] text-[#a02010]">lock</span>
                <span>Read-only policy matrix</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fdf9f4] border-b border-[#e2bfb8]/60 text-[11px] font-bold uppercase tracking-wider text-[#6b4f47]">
                    <th className="py-3 px-5">Permission</th>
                    {ADMIN_ROLE_ORDER.map((role) => (
                      <th key={role} className="py-3 px-4 text-center whitespace-nowrap">
                        {ADMIN_ROLE_LABELS[role]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1ede8] text-xs">
                  {ROLE_PERMISSIONS_MATRIX.map((row) => (
                    <tr key={row.id} className="hover:bg-[#fdf9f4]/60">
                      <td className="py-3 px-5 font-semibold text-[#1c1c19] whitespace-nowrap">
                        {row.label}
                      </td>
                      {ADMIN_ROLE_ORDER.map((role) => {
                        const allowed = row.roles[role];
                        return (
                          <td key={role} className="py-3 px-4 text-center">
                            {allowed ? (
                              <span
                                aria-label={`${ADMIN_ROLE_LABELS[role]}: Allowed`}
                                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-[#1b5e20]"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  check
                                </span>
                              </span>
                            ) : (
                              <span
                                aria-label={`${ADMIN_ROLE_LABELS[role]}: Not allowed`}
                                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[#8d706b]/60"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  remove
                                </span>
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 3: PENDING APPROVALS */}
        {activeTab === 'pending' && (
          <section
            aria-labelledby="pending-approvals-heading"
            className="bg-white rounded-xl border border-[#e2bfb8]/80 shadow-xs overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-[#f1ede8] flex items-center justify-between gap-2">
              <div>
                <h2
                  id="pending-approvals-heading"
                  className="font-headline text-sm sm:text-base font-bold text-[#38231d]"
                >
                  Pending account approvals
                </h2>
                <p className="text-xs text-[#6b4f47] mt-0.5">
                  Review newly registered accounts awaiting administrative verification.
                </p>
              </div>
              <span className="text-xs font-semibold text-[#6b4f47] tabular-nums">
                {pendingUsers.length} pending
              </span>
            </div>

            {isLoading ? (
              <div className="p-6 space-y-3 animate-pulse">
                <div className="h-14 rounded-xl bg-[#f1ede8]" />
                <div className="h-14 rounded-xl bg-[#f1ede8]" />
              </div>
            ) : pendingUsers.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#1b5e20] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">verified_user</span>
                </div>
                <p className="text-sm font-bold text-[#1c1c19]">No pending approvals</p>
                <p className="text-xs text-[#6b4f47]">
                  All registered user accounts have been reviewed.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[#f1ede8]">
                {pendingUsers.map((user) => (
                  <li
                    key={user.id}
                    className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#fdf9f4]/60"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        aria-hidden="true"
                        className="w-9 h-9 rounded-full bg-[#a02010] text-white font-bold text-xs flex items-center justify-center shrink-0"
                      >
                        {getInitials(user.displayName)}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-[#1c1c19] truncate">
                          {user.displayName}
                        </div>
                        <div className="text-xs text-[#5a413c] truncate">
                          {user.email || 'Not provided'} • {formatPhone(user.phone)}
                        </div>
                        <div className="text-[11px] text-[#6b4f47] mt-0.5 flex flex-wrap items-center gap-2">
                          <span>Role: {ADMIN_ROLE_LABELS[user.role]}</span>
                          <span>•</span>
                          <span>Organisation: {user.organisation || 'Not provided'}</span>
                          <span>•</span>
                          <span>Joined: {formatJoinedDate(user.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        disabled={isSavingAction}
                        onClick={() => handleStatusUpdate(user, 'DEACTIVATED', 'rejected')}
                        className="h-9 px-3.5 rounded-lg border border-[#e2bfb8] bg-white hover:bg-red-50 text-[#a02010] text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        disabled={isSavingAction}
                        onClick={() => handleStatusUpdate(user, 'ACTIVE', 'approved')}
                        className="h-9 px-4 rounded-lg bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Approve
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {/* ADD USER RIGHT-SIDE DRAWER */}
      {isAddDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-user-drawer-title"
        >
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-xs"
            onClick={() => !isSavingAction && setIsAddDrawerOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-white h-full shadow-2xl border-l border-[#e2bfb8] flex flex-col">
            <div className="px-6 py-4 border-b border-[#f1ede8] flex items-center justify-between">
              <div>
                <h2
                  id="add-user-drawer-title"
                  className="font-headline text-lg font-bold text-[#38231d]"
                >
                  Add user
                </h2>
                <p className="text-xs text-[#6b4f47]">
                  Provision a new CEDA Innovation Portal account.
                </p>
              </div>
              <button
                type="button"
                disabled={isSavingAction}
                onClick={() => setIsAddDrawerOpen(false)}
                aria-label="Close Add user drawer"
                className="w-8 h-8 rounded-lg hover:bg-[#f1ede8] text-[#5a413c] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {addSubmitError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#a02010] font-medium"
                >
                  {addSubmitError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="add-first-name" className="block text-xs font-bold text-[#1c1c19] mb-1">
                    First name <span className="text-[#a02010]">*</span>
                  </label>
                  <input
                    id="add-first-name"
                    type="text"
                    value={addFirstName}
                    onChange={(e) => setAddFirstName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-[#fdf9f4] focus:bg-white border border-[#e2bfb8] focus:border-[#a02010] text-xs font-medium text-[#1c1c19]"
                  />
                  {addErrors.firstName && (
                    <p className="text-[11px] text-[#a02010] mt-1">{addErrors.firstName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="add-surname" className="block text-xs font-bold text-[#1c1c19] mb-1">
                    Surname <span className="text-[#a02010]">*</span>
                  </label>
                  <input
                    id="add-surname"
                    type="text"
                    value={addSurname}
                    onChange={(e) => setAddSurname(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-[#fdf9f4] focus:bg-white border border-[#e2bfb8] focus:border-[#a02010] text-xs font-medium text-[#1c1c19]"
                  />
                  {addErrors.surname && (
                    <p className="text-[11px] text-[#a02010] mt-1">{addErrors.surname}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="add-email" className="block text-xs font-bold text-[#1c1c19] mb-1">
                  Email <span className="text-[#a02010]">*</span>
                </label>
                <input
                  id="add-email"
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="name@ceda.co.bw"
                  className="w-full h-10 px-3 rounded-lg bg-[#fdf9f4] focus:bg-white border border-[#e2bfb8] focus:border-[#a02010] text-xs font-medium text-[#1c1c19]"
                />
                {addErrors.email && (
                  <p className="text-[11px] text-[#a02010] mt-1">{addErrors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="add-phone" className="block text-xs font-bold text-[#1c1c19] mb-1">
                  Phone
                </label>
                <div className="flex items-center">
                  <span className="h-10 px-3 rounded-l-lg bg-[#f1ede8] border border-r-0 border-[#e2bfb8] text-xs font-bold text-[#5a413c] inline-flex items-center">
                    +267
                  </span>
                  <input
                    id="add-phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={8}
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="71234567"
                    className="flex-1 h-10 px-3 rounded-r-lg bg-[#fdf9f4] focus:bg-white border border-[#e2bfb8] focus:border-[#a02010] text-xs font-medium text-[#1c1c19] tabular-nums"
                  />
                </div>
                {addErrors.phone && (
                  <p className="text-[11px] text-[#a02010] mt-1">{addErrors.phone}</p>
                )}
              </div>

              <div>
                <label htmlFor="add-role" className="block text-xs font-bold text-[#1c1c19] mb-1">
                  Role <span className="text-[#a02010]">*</span>
                </label>
                <select
                  id="add-role"
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as UserRole)}
                  className="w-full h-10 px-3 rounded-lg bg-[#fdf9f4] focus:bg-white border border-[#e2bfb8] focus:border-[#a02010] text-xs font-medium text-[#1c1c19]"
                >
                  {ADMIN_ROLE_ORDER.map((role) => (
                    <option key={role} value={role}>
                      {ADMIN_ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="add-organisation" className="block text-xs font-bold text-[#1c1c19] mb-1">
                  Organisation
                </label>
                <input
                  id="add-organisation"
                  type="text"
                  value={addOrganisation}
                  onChange={(e) => setAddOrganisation(e.target.value)}
                  placeholder="e.g. CEDA / BDIH / Enterprise name"
                  className="w-full h-10 px-3 rounded-lg bg-[#fdf9f4] focus:bg-white border border-[#e2bfb8] focus:border-[#a02010] text-xs font-medium text-[#1c1c19]"
                />
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-lg bg-[#fdf9f4] border border-[#e2bfb8]/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addSendResetEmail}
                  onChange={(e) => setAddSendResetEmail(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#a02010] rounded"
                />
                <span className="text-xs text-[#1c1c19]">
                  <strong className="block font-semibold">Send password setup email</strong>
                  <span className="text-[11px] text-[#6b4f47]">
                    Dispatches a password setup link immediately after account creation.
                  </span>
                </span>
              </label>

              <div className="mt-auto pt-4 border-t border-[#f1ede8] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSavingAction}
                  onClick={() => setIsAddDrawerOpen(false)}
                  className="h-10 px-4 rounded-lg border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-xs font-semibold text-[#38231d]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAction}
                  className="h-10 px-5 rounded-lg bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold disabled:opacity-55 inline-flex items-center gap-2 cursor-pointer"
                >
                  {isSavingAction ? 'Creating...' : 'Create user'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER RIGHT-SIDE DRAWER */}
      {editUser && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-drawer-title"
        >
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-xs"
            onClick={() => !isSavingAction && setEditUser(null)}
          />
          <div className="relative z-10 w-full max-w-md bg-white h-full shadow-2xl border-l border-[#e2bfb8] flex flex-col">
            <div className="px-6 py-4 border-b border-[#f1ede8] flex items-center justify-between">
              <div>
                <h2
                  id="edit-user-drawer-title"
                  className="font-headline text-lg font-bold text-[#38231d]"
                >
                  Edit user
                </h2>
                <p className="text-xs text-[#6b4f47] truncate">{editUser.email || 'Not provided'}</p>
              </div>
              <button
                type="button"
                disabled={isSavingAction}
                onClick={() => setEditUser(null)}
                aria-label="Close Edit user drawer"
                className="w-8 h-8 rounded-lg hover:bg-[#f1ede8] text-[#5a413c] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {editSubmitError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#a02010] font-medium"
                >
                  {editSubmitError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="edit-first-name" className="block text-xs font-bold text-[#1c1c19] mb-1">
                    First name <span className="text-[#a02010]">*</span>
                  </label>
                  <input
                    id="edit-first-name"
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-[#fdf9f4] focus:bg-white border border-[#e2bfb8] focus:border-[#a02010] text-xs font-medium text-[#1c1c19]"
                  />
                  {editErrors.firstName && (
                    <p className="text-[11px] text-[#a02010] mt-1">{editErrors.firstName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="edit-surname" className="block text-xs font-bold text-[#1c1c19] mb-1">
                    Surname <span className="text-[#a02010]">*</span>
                  </label>
                  <input
                    id="edit-surname"
                    type="text"
                    value={editSurname}
                    onChange={(e) => setEditSurname(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-[#fdf9f4] focus:bg-white border border-[#e2bfb8] focus:border-[#a02010] text-xs font-medium text-[#1c1c19]"
                  />
                  {editErrors.surname && (
                    <p className="text-[11px] text-[#a02010] mt-1">{editErrors.surname}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="edit-phone" className="block text-xs font-bold text-[#1c1c19] mb-1">
                  Phone
                </label>
                <div className="flex items-center">
                  <span className="h-10 px-3 rounded-l-lg bg-[#f1ede8] border border-r-0 border-[#e2bfb8] text-xs font-bold text-[#5a413c] inline-flex items-center">
                    +267
                  </span>
                  <input
                    id="edit-phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={8}
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="71234567"
                    className="flex-1 h-10 px-3 rounded-r-lg bg-[#fdf9f4] focus:bg-white border border-[#e2bfb8] focus:border-[#a02010] text-xs font-medium text-[#1c1c19] tabular-nums"
                  />
                </div>
                {editErrors.phone && (
                  <p className="text-[11px] text-[#a02010] mt-1">{editErrors.phone}</p>
                )}
              </div>

              <div>
                <label htmlFor="edit-organisation" className="block text-xs font-bold text-[#1c1c19] mb-1">
                  Organisation
                </label>
                <input
                  id="edit-organisation"
                  type="text"
                  value={editOrganisation}
                  onChange={(e) => setEditOrganisation(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-[#fdf9f4] focus:bg-white border border-[#e2bfb8] focus:border-[#a02010] text-xs font-medium text-[#1c1c19]"
                />
              </div>

              <div className="mt-auto pt-4 border-t border-[#f1ede8] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSavingAction}
                  onClick={() => setEditUser(null)}
                  className="h-10 px-4 rounded-lg border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-xs font-semibold text-[#38231d]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAction}
                  className="h-10 px-5 rounded-lg bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold disabled:opacity-55 cursor-pointer"
                >
                  {isSavingAction ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER DETAILS RIGHT-SIDE DRAWER */}
      {detailsUser && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="details-drawer-title"
        >
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-xs"
            onClick={() => setDetailsUser(null)}
          />
          <div className="relative z-10 w-full max-w-md bg-white h-full shadow-2xl border-l border-[#e2bfb8] flex flex-col">
            <div className="px-6 py-4 border-b border-[#f1ede8] flex items-center justify-between">
              <h2
                id="details-drawer-title"
                className="font-headline text-lg font-bold text-[#38231d]"
              >
                User details
              </h2>
              <button
                type="button"
                onClick={() => setDetailsUser(null)}
                aria-label="Close User details drawer"
                className="w-8 h-8 rounded-lg hover:bg-[#f1ede8] text-[#5a413c] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
              <div className="flex items-center gap-3.5">
                <span
                  aria-hidden="true"
                  className="w-12 h-12 rounded-full bg-[#a02010] text-white font-bold text-sm flex items-center justify-center shrink-0"
                >
                  {getInitials(detailsUser.displayName)}
                </span>
                <div className="min-w-0">
                  <h3 className="font-headline text-base font-bold text-[#1c1c19] truncate">
                    {detailsUser.displayName}
                  </h3>
                  <p className="text-xs text-[#5a413c] truncate">
                    {detailsUser.email || 'Not provided'}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                        ROLE_BADGE_CLASSES[detailsUser.role]
                      }`}
                    >
                      {ADMIN_ROLE_LABELS[detailsUser.role]}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                        STATUS_META[detailsUser.status].badgeClass
                      }`}
                    >
                      <span className="material-symbols-outlined text-[12px]">
                        {STATUS_META[detailsUser.status].icon}
                      </span>
                      <span>{STATUS_META[detailsUser.status].label}</span>
                    </span>
                  </div>
                </div>
              </div>

              <dl className="bg-[#fdf9f4] rounded-xl border border-[#e2bfb8]/60 p-4 grid grid-cols-1 gap-3 text-xs">
                <div>
                  <dt className="text-[11px] text-[#6b4f47] font-semibold">Phone</dt>
                  <dd className="text-[#1c1c19] font-medium mt-0.5 tabular-nums">
                    {formatPhone(detailsUser.phone)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-[#6b4f47] font-semibold">Organisation</dt>
                  <dd className="text-[#1c1c19] font-medium mt-0.5">
                    {detailsUser.organisation || 'Not provided'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-[#6b4f47] font-semibold">Omang / Passport</dt>
                  <dd className="text-[#1c1c19] font-medium mt-0.5 tabular-nums">
                    {maskOmang(detailsUser.omangOrPassport)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-[#6b4f47] font-semibold">Location</dt>
                  <dd className="text-[#1c1c19] font-medium mt-0.5">
                    {detailsUser.town || detailsUser.district
                      ? [detailsUser.town, detailsUser.district].filter(Boolean).join(', ')
                      : 'Not provided'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-[#6b4f47] font-semibold">Verification</dt>
                  <dd className="flex items-center gap-3 mt-1">
                    <span className="inline-flex items-center gap-1 text-[#1c1c19]">
                      <span
                        className={`material-symbols-outlined text-[15px] ${
                          detailsUser.emailVerified ? 'text-[#1b5e20]' : 'text-[#8d706b]'
                        }`}
                      >
                        {detailsUser.emailVerified ? 'mark_email_read' : 'mail'}
                      </span>
                      <span>{detailsUser.emailVerified ? 'Email verified' : 'Email unverified'}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#1c1c19]">
                      <span
                        className={`material-symbols-outlined text-[15px] ${
                          detailsUser.phoneVerified ? 'text-[#1b5e20]' : 'text-[#8d706b]'
                        }`}
                      >
                        {detailsUser.phoneVerified ? 'phonelink_ring' : 'phone_iphone'}
                      </span>
                      <span>{detailsUser.phoneVerified ? 'Phone verified' : 'Phone unverified'}</span>
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-[#6b4f47] font-semibold">Joined</dt>
                  <dd className="text-[#1c1c19] font-medium mt-0.5 tabular-nums">
                    {formatJoinedDate(detailsUser.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-[#6b4f47] font-semibold">Last sign in</dt>
                  <dd className="text-[#1c1c19] font-medium mt-0.5 tabular-nums">
                    {detailsUser.lastLoginAt
                      ? formatJoinedDate(detailsUser.lastLoginAt)
                      : 'Never signed in'}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => openEditDrawer(detailsUser)}
                  className="h-9 px-3.5 rounded-lg border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-xs font-semibold text-[#38231d] cursor-pointer"
                >
                  Edit profile
                </button>
                <button
                  type="button"
                  disabled={Boolean(getGuardrailReason(detailsUser, 'demote'))}
                  onClick={() => openRoleModal(detailsUser)}
                  className="h-9 px-3.5 rounded-lg border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-xs font-semibold text-[#38231d] disabled:opacity-45 cursor-pointer"
                >
                  Change role
                </button>
                <button
                  type="button"
                  disabled={isSavingAction || !detailsUser.email}
                  onClick={() => handlePasswordReset(detailsUser, !detailsUser.lastLoginAt)}
                  className="h-9 px-3.5 rounded-lg border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-xs font-semibold text-[#38231d] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSavingAction
                    ? 'Sending...'
                    : !detailsUser.lastLoginAt
                    ? 'Resend invite'
                    : 'Send password reset'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE ROLE CONFIRMATION MODAL */}
      {roleModalUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-role-modal-title"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => !isSavingAction && setRoleModalUser(null)}
          />
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#e2bfb8] p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="change-role-modal-title"
                  className="font-headline text-lg font-bold text-[#38231d]"
                >
                  Change user role
                </h2>
                <p className="text-xs text-[#6b4f47] mt-0.5">{roleModalUser.displayName}</p>
              </div>
              <button
                type="button"
                disabled={isSavingAction}
                onClick={() => setRoleModalUser(null)}
                aria-label="Close Change role modal"
                className="w-8 h-8 rounded-lg hover:bg-[#f1ede8] text-[#5a413c] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#6b4f47]">Current role:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${
                  ROLE_BADGE_CLASSES[roleModalUser.role]
                }`}
              >
                {ADMIN_ROLE_LABELS[roleModalUser.role]}
              </span>
            </div>

            <div>
              <label htmlFor="modal-new-role" className="block text-xs font-bold text-[#1c1c19] mb-1">
                New role
              </label>
              <select
                id="modal-new-role"
                value={selectedNewRole}
                onChange={(e) => setSelectedNewRole(e.target.value as UserRole)}
                className="w-full h-10 px-3 rounded-lg bg-[#fdf9f4] border border-[#e2bfb8] text-xs font-medium text-[#1c1c19]"
              >
                {ADMIN_ROLE_ORDER.map((role) => (
                  <option key={role} value={role}>
                    {ADMIN_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-lg bg-[#fdf9f4] border border-[#e2bfb8]/60 text-xs text-[#5a413c]">
              <strong className="text-[#1c1c19] block mb-0.5">
                {ADMIN_ROLE_LABELS[selectedNewRole]} access:
              </strong>
              <span>{ADMIN_ROLE_CHANGE_NOTES[selectedNewRole]}</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isSavingAction}
                onClick={() => setRoleModalUser(null)}
                className="h-9 px-4 rounded-lg border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-xs font-semibold text-[#38231d]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingAction || selectedNewRole === roleModalUser.role}
                onClick={handleConfirmRoleChange}
                className="h-9 px-4 rounded-lg bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                {isSavingAction ? 'Updating...' : 'Confirm role change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUSPEND / DEACTIVATE CONFIRMATION MODAL */}
      {pendingActionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="status-confirm-modal-title"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => !isSavingAction && setPendingActionModal(null)}
          />
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#e2bfb8] p-6 flex flex-col gap-4">
            <h2
              id="status-confirm-modal-title"
              className="font-headline text-lg font-bold text-[#38231d]"
            >
              {pendingActionModal.type === 'suspend'
                ? 'Suspend user account?'
                : 'Deactivate user account?'}
            </h2>
            <p className="text-xs text-[#5a413c] leading-relaxed">
              {pendingActionModal.type === 'suspend'
                ? `${pendingActionModal.user.displayName} will be immediately blocked from signing in until an administrator reactivates their account.`
                : `${pendingActionModal.user.displayName} will be deactivated and blocked from signing in to the CEDA Innovation Portal.`}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isSavingAction}
                onClick={() => setPendingActionModal(null)}
                className="h-9 px-4 rounded-lg border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-xs font-semibold text-[#38231d]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingAction}
                onClick={() =>
                  handleStatusUpdate(
                    pendingActionModal.user,
                    pendingActionModal.type === 'suspend' ? 'SUSPENDED' : 'DEACTIVATED',
                    pendingActionModal.type === 'suspend' ? 'suspended' : 'deactivated'
                  )
                }
                className="h-9 px-4 rounded-lg bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                {isSavingAction
                  ? 'Updating...'
                  : pendingActionModal.type === 'suspend'
                  ? 'Suspend user'
                  : 'Deactivate user'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS */}
      {successToast && (
        <div
          role="status"
          className="fixed bottom-20 lg:bottom-6 right-5 z-50 max-w-sm bg-[#1b5e20] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-medium"
        >
          <span className="material-symbols-outlined text-[18px] shrink-0">check_circle</span>
          <span className="flex-1">{successToast}</span>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            aria-label="Dismiss notification"
            className="text-white/80 hover:text-white"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {errorToast && (
        <div
          role="alert"
          className="fixed bottom-20 lg:bottom-6 right-5 z-50 max-w-md bg-[#7c0700] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs font-medium"
        >
          <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
          <span className="flex-1">{errorToast.message}</span>
          {errorToast.retryable && (
            <button
              type="button"
              onClick={loadUsers}
              className="px-2.5 py-1 rounded-md bg-white/15 hover:bg-white/25 text-white font-bold shrink-0 cursor-pointer"
            >
              Retry
            </button>
          )}
          <button
            type="button"
            onClick={() => setErrorToast(null)}
            aria-label="Dismiss error"
            className="text-white/80 hover:text-white"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
    </AdminLayout>
  );
};
