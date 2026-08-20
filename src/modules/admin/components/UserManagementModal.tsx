import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  UserPlus,
  UserCheck,
  Mail,
  Phone,
  Building2,
  Briefcase,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Lock,
  RefreshCw,
  Layers,
  Check,
  User,
  Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export type PermissionCategory =
  | 'Dashboard'
  | 'Data Entry'
  | 'Reports'
  | 'MIS Reports'
  | 'Masters'
  | 'Downloads'
  | 'Settings';

export interface UserPermissionActions {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
}

export type PermissionsMap = Record<PermissionCategory, UserPermissionActions>;

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  'Dashboard',
  'Data Entry',
  'Reports',
  'MIS Reports',
  'Masters',
  'Downloads',
  'Settings',
];

export const DEFAULT_PERMISSIONS: PermissionsMap = {
  Dashboard: { view: true, add: false, edit: false, delete: false, export: true },
  'Data Entry': { view: true, add: true, edit: true, delete: false, export: true },
  Reports: { view: true, add: false, edit: false, delete: false, export: true },
  'MIS Reports': { view: true, add: false, edit: false, delete: false, export: true },
  Masters: { view: true, add: true, edit: true, delete: false, export: false },
  Downloads: { view: true, add: false, edit: false, delete: false, export: true },
  Settings: { view: false, add: false, edit: false, delete: false, export: false },
};

export const ADMIN_PERMISSIONS: PermissionsMap = {
  Dashboard: { view: true, add: true, edit: true, delete: true, export: true },
  'Data Entry': { view: true, add: true, edit: true, delete: true, export: true },
  Reports: { view: true, add: true, edit: true, delete: true, export: true },
  'MIS Reports': { view: true, add: true, edit: true, delete: true, export: true },
  Masters: { view: true, add: true, edit: true, delete: true, export: true },
  Downloads: { view: true, add: true, edit: true, delete: true, export: true },
  Settings: { view: true, add: true, edit: true, delete: true, export: true },
};

export interface UserFormData {
  id?: string;
  fullName: string;
  employeeId: string;
  email: string;
  mobile: string;
  role: 'admin' | 'office' | 'auditor' | 'operator' | 'viewer';
  department: string;
  officeId: string | null;
  officeName?: string;
  designation: string;
  username: string;
  password?: string;
  confirmPassword?: string;
  status: 'active' | 'inactive';
  permissions: PermissionsMap;
}

export interface ExistingUserCheck {
  id?: string;
  email: string;
  employeeId?: string;
  username?: string;
}

export interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  user?: Partial<UserFormData> | null;
  existingUsers?: ExistingUserCheck[];
  offices: Array<{ id: string; name: string; users?: number }>;
  onSave: (data: UserFormData) => Promise<string | void>;
  onResetPassword?: (userId: string, email: string) => Promise<void>;
}

const DEPARTMENTS = [
  'Accounts & Finance',
  'Establishment & Payroll',
  'Audit & Vigilance',
  'Administration & General',
  'Revenue & Tax Collection',
  'IT & Systems',
];

const ROLES = [
  { value: 'office', label: 'Office User', desc: 'Standard office operator with data entry & report rights' },
  { value: 'admin', label: 'System Admin', desc: 'Full administrative access across all offices & settings' },
  { value: 'auditor', label: 'Auditor', desc: 'Read-only audit & MIS reporting access' },
  { value: 'operator', label: 'Data Entry Operator', desc: 'Day-to-day data entry and pay bill preparation' },
  { value: 'viewer', label: 'Viewer', desc: 'Restricted view-only permissions' },
];

export function UserManagementModal({
  isOpen,
  onClose,
  mode,
  user,
  existingUsers = [],
  offices,
  onSave,
  onResetPassword,
}: UserManagementModalProps) {
  const { toast } = useToast();

  const [formData, setFormData] = useState<UserFormData>({
    fullName: '',
    employeeId: '',
    email: '',
    mobile: '',
    role: 'office',
    department: 'Accounts & Finance',
    officeId: null,
    officeName: '',
    designation: '',
    username: '',
    password: '',
    confirmPassword: '',
    status: 'active',
    permissions: DEFAULT_PERMISSIONS,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Initialize form when opening or changing user
  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && user) {
      setFormData({
        id: user.id,
        fullName: user.fullName || '',
        employeeId: user.employeeId || '',
        email: user.email || '',
        mobile: user.mobile || '',
        role: user.role || 'office',
        department: user.department || 'Accounts & Finance',
        officeId: user.officeId ?? null,
        officeName: user.officeName || '',
        designation: user.designation || '',
        username: user.username || user.email?.split('@')[0] || '',
        status: user.status || 'active',
        permissions: user.permissions || (user.role === 'admin' ? ADMIN_PERMISSIONS : DEFAULT_PERMISSIONS),
      });
    } else {
      setFormData({
        fullName: '',
        employeeId: '',
        email: '',
        mobile: '',
        role: 'office',
        department: 'Accounts & Finance',
        officeId: offices[0]?.id ?? null,
        officeName: offices[0]?.name ?? '',
        designation: '',
        username: '',
        password: '',
        confirmPassword: '',
        status: 'active',
        permissions: DEFAULT_PERMISSIONS,
      });
    }

    setErrors({});
    setApiError(null);
    setIsDirty(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [isOpen, mode, user, offices]);

  const handleFieldChange = (field: keyof UserFormData, value: unknown) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-generate username from email if adding and username wasn't manually altered
      if (field === 'email' && mode === 'add' && (!prev.username || prev.username === prev.email.split('@')[0])) {
        next.username = String(value).split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
      }
      return next;
    });
    setIsDirty(true);
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleRoleChange = (newRole: UserFormData['role']) => {
    handleFieldChange('role', newRole);
    if (newRole === 'admin') {
      handleFieldChange('permissions', ADMIN_PERMISSIONS);
      handleFieldChange('officeId', null);
      handleFieldChange('officeName', 'All Offices (Admin)');
    } else {
      handleFieldChange('permissions', DEFAULT_PERMISSIONS);
    }
  };

  const handlePermissionToggle = (category: PermissionCategory, action: keyof UserPermissionActions) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [category]: {
          ...prev.permissions[category],
          [action]: !prev.permissions[category][action],
        },
      },
    }));
    setIsDirty(true);
  };

  const handleCategorySelectAll = (category: PermissionCategory, select: boolean) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [category]: {
          view: select,
          add: select,
          edit: select,
          delete: select,
          export: select,
        },
      },
    }));
    setIsDirty(true);
  };

  const handleGlobalSelectAll = (select: boolean) => {
    const updated = {} as PermissionsMap;
    for (const cat of PERMISSION_CATEGORIES) {
      updated[cat] = {
        view: select,
        add: select,
        edit: select,
        delete: select,
        export: select,
      };
    }
    setFormData((prev) => ({ ...prev, permissions: updated }));
    setIsDirty(true);
  };

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      errs.fullName = 'Full name is required (min 2 characters).';
    }

    if (!formData.employeeId.trim()) {
      errs.employeeId = 'Employee ID is required.';
    } else {
      const dupEmp = existingUsers.find(
        (u) =>
          u.id !== formData.id &&
          u.employeeId &&
          u.employeeId.trim().toLowerCase() === formData.employeeId.trim().toLowerCase()
      );
      if (dupEmp) errs.employeeId = 'This Employee ID is already registered.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      errs.email = 'Valid email address is required.';
    } else {
      const dupEmail = existingUsers.find(
        (u) =>
          u.id !== formData.id &&
          u.email.trim().toLowerCase() === formData.email.trim().toLowerCase()
      );
      if (dupEmail) errs.email = 'This email address is already assigned to another user.';
    }

    if (formData.mobile.trim()) {
      const cleanMobile = formData.mobile.replace(/[\s-]/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanMobile) && !/^\+?[0-9]{10,13}$/.test(cleanMobile)) {
        errs.mobile = 'Enter a valid 10-digit mobile number.';
      }
    }

    if (!formData.username.trim() || formData.username.trim().length < 3) {
      errs.username = 'Username must be at least 3 characters.';
    } else {
      const dupUser = existingUsers.find(
        (u) =>
          u.id !== formData.id &&
          u.username &&
          u.username.trim().toLowerCase() === formData.username.trim().toLowerCase()
      );
      if (dupUser) errs.username = 'This username is already taken.';
    }

    if (formData.role !== 'admin' && !formData.officeId && offices.length > 0) {
      errs.officeId = 'Please select an office for this user.';
    }

    if (mode === 'add') {
      if (!formData.password || formData.password.length < 8) {
        errs.password = 'Password must be at least 8 characters.';
      }
      if (formData.password !== formData.confirmPassword) {
        errs.confirmPassword = 'Passwords do not match.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [formData, existingUsers, offices, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) {
      toast({
        title: 'Validation Error',
        description: 'Please correct the highlighted fields before saving.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const selectedOffice = offices.find((o) => o.id === formData.officeId);
      const payload: UserFormData = {
        ...formData,
        fullName: formData.fullName.trim(),
        employeeId: formData.employeeId.trim(),
        email: formData.email.trim().toLowerCase(),
        username: formData.username.trim().toLowerCase(),
        officeName: formData.role === 'admin' ? 'All Offices' : selectedOffice?.name || formData.officeName,
      };

      const resultMsg = await onSave(payload);
      toast({
        title: mode === 'add' ? 'User Created Successfully' : 'User Updated Successfully',
        description:
          typeof resultMsg === 'string'
            ? resultMsg
            : mode === 'add'
            ? `User account for ${payload.fullName} was created.`
            : `User account for ${payload.fullName} was updated.`,
      });
      setIsDirty(false);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred while saving user.';
      setApiError(msg);
      toast({
        title: 'Operation Failed',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSafeClose = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to discard them?')) {
        setIsDirty(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleTriggerPasswordReset = async () => {
    if (!formData.id || !onResetPassword) return;
    try {
      setIsResettingPassword(true);
      await onResetPassword(formData.id, formData.email);
      toast({
        title: 'Password Reset Initiated',
        description: `Password reset link sent to ${formData.email}.`,
      });
    } catch (err) {
      toast({
        title: 'Password Reset Failed',
        description: err instanceof Error ? err.message : 'Could not reset password.',
        variant: 'destructive',
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Keyboard navigation: Escape closes when safe
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleSafeClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-600">
              {mode === 'add' ? <UserPlus className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
            </div>
            <div>
              <h2 id="modal-title" className="text-base font-bold text-slate-900">
                {mode === 'add' ? 'Add New User' : 'Edit User'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {mode === 'add'
                  ? 'Create a new user account and assign access.'
                  : 'Update user information and access settings.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSafeClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="user-mgmt-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {apiError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">Error saving user</strong>
                <span>{apiError}</span>
              </div>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-blue-600" /> 1. User Profile &amp; Identification
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <Label htmlFor="fullName" className="text-xs font-semibold text-slate-700">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleFieldChange('fullName', e.target.value)}
                  placeholder="e.g. Rameshchandra Patel"
                  className={`mt-1 text-sm ${errors.fullName ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                />
                {errors.fullName && <p className="text-red-500 text-[11px] mt-1">{errors.fullName}</p>}
              </div>

              {/* Employee ID */}
              <div>
                <Label htmlFor="employeeId" className="text-xs font-semibold text-slate-700">
                  Employee ID <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1">
                  <Hash className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="employeeId"
                    value={formData.employeeId}
                    onChange={(e) => handleFieldChange('employeeId', e.target.value.toUpperCase())}
                    placeholder="e.g. EMP-1042"
                    className={`pl-9 font-mono text-sm uppercase ${
                      errors.employeeId ? 'border-red-400 focus-visible:ring-red-400' : ''
                    }`}
                  />
                </div>
                {errors.employeeId && <p className="text-red-500 text-[11px] mt-1">{errors.employeeId}</p>}
              </div>

              {/* Email Address */}
              <div>
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1">
                  <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    placeholder="user@gujarat.gov.in"
                    className={`pl-9 text-sm ${errors.email ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                  />
                </div>
                {errors.email && <p className="text-red-500 text-[11px] mt-1">{errors.email}</p>}
              </div>

              {/* Mobile Number */}
              <div>
                <Label htmlFor="mobile" className="text-xs font-semibold text-slate-700">
                  Mobile Number
                </Label>
                <div className="relative mt-1">
                  <Phone className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="mobile"
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => handleFieldChange('mobile', e.target.value)}
                    placeholder="9876543210"
                    maxLength={13}
                    className={`pl-9 font-mono text-sm ${
                      errors.mobile ? 'border-red-400 focus-visible:ring-red-400' : ''
                    }`}
                  />
                </div>
                {errors.mobile && <p className="text-red-500 text-[11px] mt-1">{errors.mobile}</p>}
              </div>

              {/* Designation */}
              <div>
                <Label htmlFor="designation" className="text-xs font-semibold text-slate-700">
                  Designation
                </Label>
                <div className="relative mt-1">
                  <Briefcase className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="designation"
                    value={formData.designation}
                    onChange={(e) => handleFieldChange('designation', e.target.value)}
                    placeholder="e.g. Senior Accountant"
                    className="pl-9 text-sm"
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <Label htmlFor="department" className="text-xs font-semibold text-slate-700">
                  Department
                </Label>
                <select
                  id="department"
                  value={formData.department}
                  onChange={(e) => handleFieldChange('department', e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Role, Office & Account Credentials */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> 2. Role, Institution &amp; Credentials
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* User Role */}
              <div>
                <Label htmlFor="role" className="text-xs font-semibold text-slate-700">
                  User Role <span className="text-red-500">*</span>
                </Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => handleRoleChange(e.target.value as UserFormData['role'])}
                  className="mt-1 w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  {ROLES.find((r) => r.value === formData.role)?.desc}
                </p>
              </div>

              {/* Office / Institution */}
              <div>
                <Label htmlFor="officeId" className="text-xs font-semibold text-slate-700">
                  Office / Institution {formData.role === 'admin' ? '(Global / All Offices)' : <span className="text-red-500">*</span>}
                </Label>
                <div className="relative mt-1">
                  <Building2 className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    id="officeId"
                    value={formData.officeId || ''}
                    disabled={formData.role === 'admin'}
                    onChange={(e) => handleFieldChange('officeId', e.target.value || null)}
                    className={`pl-9 w-full h-9 rounded-md border bg-white px-3 text-sm ${
                      formData.role === 'admin' ? 'bg-slate-100 text-slate-400' : 'border-slate-300'
                    } ${errors.officeId ? 'border-red-400' : ''}`}
                  >
                    {formData.role === 'admin' ? (
                      <option value="">All Offices (System Admin)</option>
                    ) : (
                      <>
                        <option value="" disabled>Select Office...</option>
                        {offices.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
                {errors.officeId && <p className="text-red-500 text-[11px] mt-1">{errors.officeId}</p>}
              </div>

              {/* Username */}
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="username" className="text-xs font-semibold text-slate-700">
                    Username <span className="text-red-500">*</span>
                  </Label>
                  {mode === 'edit' && (
                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                      System ID
                    </span>
                  )}
                </div>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleFieldChange('username', e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                  placeholder="r.patel"
                  className={`mt-1 font-mono text-sm ${errors.username ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                />
                {errors.username && <p className="text-red-500 text-[11px] mt-1">{errors.username}</p>}
              </div>

              {/* Account Status */}
              <div>
                <Label className="text-xs font-semibold text-slate-700">Account Status</Label>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => handleFieldChange('status', 'active')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                      formData.status === 'active'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Active
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFieldChange('status', 'inactive')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                      formData.status === 'inactive'
                        ? 'bg-red-50 border-red-300 text-red-800 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <Lock className="h-3.5 w-3.5 text-red-500" /> Inactive / Suspended
                  </button>
                </div>
              </div>

              {/* Password Fields (Only on Add Mode) */}
              {mode === 'add' ? (
                <>
                  <div>
                    <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                      Password <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative mt-1">
                      <KeyRound className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password || ''}
                        onChange={(e) => handleFieldChange('password', e.target.value)}
                        placeholder="Min 8 characters"
                        className={`pl-9 pr-9 text-sm ${
                          errors.password ? 'border-red-400 focus-visible:ring-red-400' : ''
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-500 text-[11px] mt-1">{errors.password}</p>}
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-700">
                      Confirm Password <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative mt-1">
                      <KeyRound className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword || ''}
                        onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                        placeholder="Re-enter password"
                        className={`pl-9 pr-9 text-sm ${
                          errors.confirmPassword ? 'border-red-400 focus-visible:ring-red-400' : ''
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((s) => !s)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-red-500 text-[11px] mt-1">{errors.confirmPassword}</p>
                    )}
                  </div>
                </>
              ) : (
                /* In Edit Mode: Dedicated Reset Password Trigger */
                <div className="md:col-span-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <KeyRound className="h-4 w-4 text-slate-600" />
                    <div>
                      <div className="text-xs font-semibold text-slate-800">Password &amp; Security</div>
                      <div className="text-[11px] text-slate-500">
                        Password is encrypted and protected. You can trigger a secure reset link.
                      </div>
                    </div>
                  </div>
                  {onResetPassword && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isResettingPassword}
                      onClick={handleTriggerPasswordReset}
                      className="text-xs font-semibold text-slate-700 bg-white border-slate-300 shrink-0"
                    >
                      {isResettingPassword ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> Sending...
                        </>
                      ) : (
                        <>
                          <KeyRound className="h-3.5 w-3.5 mr-1 text-blue-600" /> Reset Password
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Access Permissions Matrix */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-blue-600" /> 3. Access Permissions Matrix
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleGlobalSelectAll(true)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 px-2 py-0.5 rounded hover:bg-blue-50"
                >
                  Grant All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => handleGlobalSelectAll(false)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 px-2 py-0.5 rounded hover:bg-slate-100"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="grid grid-cols-12 bg-slate-100/80 px-3.5 py-2 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                <div className="col-span-5">Module / Category</div>
                <div className="col-span-7 grid grid-cols-5 text-center">
                  <span>View</span>
                  <span>Add</span>
                  <span>Edit</span>
                  <span>Delete</span>
                  <span>Export</span>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {PERMISSION_CATEGORIES.map((category) => {
                  const catPerms = formData.permissions[category] || {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                    export: false,
                  };
                  const allSelected =
                    catPerms.view && catPerms.add && catPerms.edit && catPerms.delete && catPerms.export;

                  return (
                    <div
                      key={category}
                      className="grid grid-cols-12 items-center px-3.5 py-2.5 text-xs hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="col-span-5 flex items-center justify-between pr-2">
                        <span className="font-semibold text-slate-800">{category}</span>
                        <button
                          type="button"
                          onClick={() => handleCategorySelectAll(category, !allSelected)}
                          className="text-[10px] text-slate-400 hover:text-blue-600 font-mono"
                          title="Toggle category row"
                        >
                          {allSelected ? 'None' : 'All'}
                        </button>
                      </div>

                      <div className="col-span-7 grid grid-cols-5 text-center">
                        {(['view', 'add', 'edit', 'delete', 'export'] as const).map((action) => (
                          <div key={action} className="flex justify-center">
                            <label className="relative flex items-center justify-center p-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!catPerms[action]}
                                onChange={() => handlePermissionToggle(category, action)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                              />
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/60">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSafeClose}
            className="text-xs text-slate-600 hover:text-slate-900"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            form="user-mgmt-form"
            disabled={isSubmitting}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving...
              </>
            ) : mode === 'add' ? (
              <>
                <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Create User
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5" /> Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default UserManagementModal;
