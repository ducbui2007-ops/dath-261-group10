"use client";

import * as React from "react";
import Link from "next/link";
import {
  AdminHeading,
  AdminTable,
  controlClass,
  DemoDialog,
  Detail,
  displayDate,
  Pagination,
} from "@/components/admin/admin-ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getUserById,
  getUsers,
  updateUserRole,
  UsersApiError,
  type UpdatedUserRole,
  type UserDetails as UserDetailsData,
  type UsersPaginationMeta,
} from "@/lib/api/users";
import type { Role, User } from "@/types/auth";

const PAGE_SIZE = 10;
const EMPTY_META: UsersPaginationMeta = {
  total: 0,
  page: 1,
  limit: PAGE_SIZE,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

function UserDetails({
  userId,
  onClose,
  onRoleUpdated,
  onRefreshList,
}: {
  userId: string;
  onClose: () => void;
  onRoleUpdated: (user: UpdatedUserRole) => void;
  onRefreshList: () => void;
}) {
  const [user, setUser] = React.useState<UserDetailsData | null>(null);
  const [error, setError] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);
  const [detailRetry, setDetailRetry] = React.useState(0);
  const [role, setRole] = React.useState<Role>("student");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [roleError, setRoleError] = React.useState<unknown>(null);
  const [roleAccessDenied, setRoleAccessDenied] = React.useState(false);
  const [roleSaved, setRoleSaved] = React.useState(false);
  const savingRef = React.useRef(false);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getUserById(userId, controller.signal)
      .then((value) => {
        setUser(value);
        setRole(value.role);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [userId, detailRetry]);

  const submitRole = async () => {
    if (!user || savingRef.current || role === user.role || roleAccessDenied) return;
    savingRef.current = true;
    setSaving(true);
    setRoleError(null);
    try {
      const updated = await updateUserRole(user.id, role);
      onRoleUpdated(updated);
      setUser((current) => current ? { ...current, ...updated } : current);
      setRoleSaved(true);
      setConfirmOpen(false);
      setDetailRetry((value) => value + 1);
    } catch (reason) {
      setRoleError(reason);
      if (reason instanceof UsersApiError && reason.status === 403) {
        setRoleAccessDenied(true);
      }
      if (reason instanceof UsersApiError && reason.status === 404) onRefreshList();
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const errorMessage =
    error instanceof UsersApiError && error.status === 401
      ? "Your session is missing or expired. Sign in again to view this user."
      : error instanceof UsersApiError && error.status === 403
        ? "Your account does not have permission to view this user."
        : error instanceof UsersApiError && error.status === 404
          ? "This user no longer exists or could not be found."
          : error instanceof Error
            ? error.message
            : "Could not load user details. Check your connection and try again.";

  const roleErrorMessage =
    roleError instanceof UsersApiError && roleError.status === 400
      ? `The server rejected this role change. ${roleError.message}`
      : roleError instanceof UsersApiError && roleError.status === 401
        ? "Your session is missing or expired. Sign in again before changing roles."
        : roleError instanceof UsersApiError && roleError.status === 403
          ? "Your account does not have permission to change roles."
          : roleError instanceof UsersApiError && roleError.status === 404
            ? "This user no longer exists. Close this dialog and refresh the list."
            : roleError instanceof Error
              ? roleError.message
              : "Could not update the role. Check your connection and try again.";

  return (
    <DemoDialog
      title="User details"
      description="Details and role changes are handled by the server. Account blocking is not connected."
      onClose={() => { if (!saving) onClose(); }}
    >
      {!user && loading && !error ? (
        <p role="status" aria-live="polite" className="py-4 text-sm text-muted-foreground">
          Loading user details…
        </p>
      ) : error && !user ? (
        <div role="alert" className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm">{errorMessage}</p>
          {error instanceof UsersApiError && error.status === 401 && (
            <Button asChild variant="outline"><Link href="/login">Sign in</Link></Button>
          )}
          <Button variant="outline" onClick={() => setDetailRetry((value) => value + 1)}>
            Retry
          </Button>
        </div>
      ) : user ? (
        <div className="space-y-4">
          {loading && <p role="status" className="text-xs text-muted-foreground">Refreshing user details…</p>}
          {error !== null && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
          <h3 className="break-words text-lg font-semibold">{user.fullName}</h3>
          {roleSaved && <p role="status" aria-live="polite" className="text-sm text-secondary">Role updated on the server.</p>}
          <Detail label="User ID"><span className="font-mono">{user.id}</span></Detail>
          <Detail label="Email">{user.email || "Not provided"}</Detail>
          <Detail label="Current Role">
            <span className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{user.role}</Badge>
              <span className="text-xs text-muted-foreground">Select a role to change this account.</span>
            </span>
          </Detail>
          <div className="space-y-2">
            <label htmlFor="user-detail-role" className="text-sm font-medium">New role</label>
            <select
              id="user-detail-role"
              className={controlClass}
              value={role}
              disabled={saving || roleAccessDenied}
              onChange={(event) => {
                setRole(event.target.value as Role);
                setRoleError(null);
                setRoleSaved(false);
              }}
            >
              {(["student", "instructor", "admin"] as Role[]).map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <Button
              disabled={saving || roleAccessDenied || role === user.role || !!error}
              onClick={() => { setRoleError(null); setConfirmOpen(true); }}
            >
              Change role
            </Button>
          </div>
          <Detail label="Avatar">{user.avatarUrl || "Not provided"}</Detail>
          <Detail label="Created">{user.createdAt ? displayDate(user.createdAt) : "Not provided"}</Detail>
          <Detail label="Permissions">
            {user.permissions && Object.keys(user.permissions).length
              ? <pre className="overflow-x-auto text-xs">{JSON.stringify(user.permissions, null, 2)}</pre>
              : "Not provided"}
          </Detail>
          <p className="text-sm text-muted-foreground">
            Account blocking and audit events are unavailable until their APIs are integrated.
          </p>
        </div>
      ) : null}
      {confirmOpen && user && (
        <DemoDialog
          title="Confirm role change"
          description="This will update the user's role on the server."
          onClose={() => { if (!saving) setConfirmOpen(false); }}
        >
          <p>
            Change <strong>{user.fullName}</strong> from <strong>{user.role}</strong> to <strong>{role}</strong>?
          </p>
          {saving && <p role="status" aria-live="polite">Updating role…</p>}
          {roleError !== null && (
            <div role="alert" className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <p>{roleErrorMessage}</p>
              {roleError instanceof UsersApiError && roleError.status === 401 && (
                <Button asChild variant="outline"><Link href="/login">Sign in</Link></Button>
              )}
              {!(roleError instanceof UsersApiError && [401, 403, 404].includes(roleError.status)) && (
                <Button variant="outline" disabled={saving} onClick={submitRole}>Retry update</Button>
              )}
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="outline" disabled={saving} onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={submitRole}>
              {saving ? "Updating…" : "Confirm role change"}
            </Button>
          </div>
        </DemoDialog>
      )}
    </DemoDialog>
  );
}

export default function AdminUsersPage() {
  const [search, setSearch] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [users, setUsers] = React.useState<User[]>([]);
  const [meta, setMeta] = React.useState(EMPTY_META);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<unknown>(null);
  const [retry, setRetry] = React.useState(0);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setQuery(search.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getUsers({ page, limit: PAGE_SIZE, search: query }, controller.signal)
      .then((result) => {
        setUsers(result.data);
        setMeta(result.meta);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason);
        setUsers([]);
        setMeta(EMPTY_META);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, query, retry]);

  const clear = () => setSearch("");
  const errorMessage =
    error instanceof UsersApiError && error.status === 401
      ? "Your session is missing or expired. Sign in again to view users."
      : error instanceof UsersApiError && error.status === 403
        ? "Your account does not have permission to view users. Admin access is required."
        : error instanceof Error
          ? error.message
          : "Could not load users. Check your connection and try again.";

  return (
    <div data-component="AdminUsersPage" className="admin-users__container_01 space-y-6">
      <AdminHeading title="Users" description="Browse server accounts and inspect user details." />
      <div className="space-y-2">
        <label htmlFor="user-search" className="text-sm font-medium">Search by name or email</label>
        <Input
          id="user-search"
          placeholder="Name or email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {error ? (
        <div role="alert" className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm">{errorMessage}</p>
          {error instanceof UsersApiError && error.status === 401 && (
            <Button asChild variant="outline"><Link href="/login">Sign in</Link></Button>
          )}
          <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          <AdminTable caption="Users" columns={["User", "Role", "Created", "Actions"]}>
            {loading ? (
              <tr><td colSpan={4} role="status" aria-live="polite">Loading users…</td></tr>
            ) : users.length ? users.map((user) => (
              <tr key={user.id}>
                <td>
                  <p className="font-semibold">{user.fullName}</p>
                  <p className="mt-1 break-all text-xs text-muted-foreground">{user.email}</p>
                </td>
                <td><Badge variant={user.role === "admin" ? "default" : "outline"}>{user.role}</Badge></td>
                <td className="whitespace-nowrap text-muted-foreground">{displayDate(user.createdAt)}</td>
                <td>
                  <Button variant="outline" size="sm" aria-label={`View user ${user.fullName}`} onClick={() => setSelectedId(user.id)}>
                    View Details
                  </Button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4}>
                  <div className="space-y-3 py-6 text-center">
                    <p className="font-medium">No users found</p>
                    <p className="text-muted-foreground">Try another name or email search.</p>
                    {query && <Button variant="outline" onClick={clear}>Clear search</Button>}
                  </div>
                </td>
              </tr>
            )}
          </AdminTable>
          <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPage={setPage} />
          <p className="text-sm text-muted-foreground">
            Role changes, account blocking and audit events are currently unavailable.
          </p>
        </>
      )}
      {selectedId && (
        <UserDetails
          key={selectedId}
          userId={selectedId}
          onClose={() => setSelectedId(null)}
          onRefreshList={() => setRetry((value) => value + 1)}
          onRoleUpdated={(updated) => {
            setUsers((current) => current.map((user) =>
              user.id === updated.id ? { ...user, ...updated } : user,
            ));
            setRetry((value) => value + 1);
          }}
        />
      )}
    </div>
  );
}
