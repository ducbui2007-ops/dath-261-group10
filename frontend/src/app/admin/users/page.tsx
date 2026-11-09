"use client";

import * as React from "react";
import Link from "next/link";
import {
  AdminHeading,
  AdminTable,
  DemoDialog,
  Detail,
  displayDate,
  Pagination,
} from "@/components/admin/admin-ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getUsers, UsersApiError, type UsersPaginationMeta } from "@/lib/api/users";
import type { User } from "@/types/auth";

const PAGE_SIZE = 10;
const EMPTY_META: UsersPaginationMeta = {
  total: 0,
  page: 1,
  limit: PAGE_SIZE,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

function UserDetails({ user, onClose }: { user: User; onClose: () => void }) {
  return (
    <DemoDialog
      title={user.fullName}
      description="User information from the server. Role changes and account blocking are not connected."
      onClose={onClose}
    >
      <Detail label="User ID"><span className="font-mono">{user.id}</span></Detail>
      <Detail label="Email">{user.email}</Detail>
      <Detail label="Created">{displayDate(user.createdAt)}</Detail>
      <Detail label="Avatar">{user.avatarUrl || "Not provided"}</Detail>
      <Detail label="Current Role"><Badge variant="secondary">{user.role}</Badge></Detail>
      <p className="text-sm text-muted-foreground">
        Role changes, account blocking and audit events are unavailable until their APIs are integrated.
      </p>
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
    setSelectedId(null);
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

  const selected = users.find((user) => user.id === selectedId);
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
      {selected && <UserDetails key={selected.id} user={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
