import { APP_CONFIG } from "../constants";
import type { Role, User } from "@/types/auth";

export interface UsersPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface UsersPage {
  data: User[];
  meta: UsersPaginationMeta;
}

export type UserDetails = Omit<User, "createdAt"> & {
  createdAt?: string;
  permissions?: Record<string, unknown>;
};

export type UpdatedUserRole = Pick<User, "id" | "email" | "fullName" | "role"> & {
  avatarUrl?: string;
};

export class UsersApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "UsersApiError";
  }
}

const isRole = (value: unknown): value is Role =>
  value === "student" || value === "instructor" || value === "admin";

export async function getUsers(
  { page, limit, search }: { page: number; limit: number; search: string },
  signal?: AbortSignal,
): Promise<UsersPage> {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search.trim()) query.set("search", search.trim());
  const response = await fetch(`${APP_CONFIG.apiUrl}/v1/users?${query}`, {
    credentials: "include",
    signal,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new UsersApiError(
      response.status,
      typeof body.message === "string" ? body.message : response.statusText,
    );
  }

  const result = await response.json();
  if (
    result?.success !== true ||
    !Array.isArray(result.data) ||
    !result.meta ||
    !Number.isInteger(result.meta.total) ||
    result.meta.total < 0 ||
    !Number.isInteger(result.meta.page) ||
    result.meta.page < 1 ||
    !Number.isInteger(result.meta.limit) ||
    result.meta.limit < 1 ||
    !Number.isInteger(result.meta.totalPages) ||
    result.meta.totalPages < 1 ||
    typeof result.meta.hasNextPage !== "boolean" ||
    typeof result.meta.hasPreviousPage !== "boolean" ||
    !result.data.every(
      (user: Record<string, unknown>) =>
        typeof user.id === "string" &&
        typeof user.email === "string" &&
        typeof user.fullName === "string" &&
        isRole(user.role) &&
        (user.avatarUrl === null || typeof user.avatarUrl === "string") &&
        typeof user.createdAt === "string" &&
        Number.isFinite(Date.parse(user.createdAt)),
    )
  ) {
    throw new Error("The users API returned data in an unexpected format.");
  }
  return {
    data: result.data.map((user: Record<string, unknown>) => ({
      id: user.id as string,
      email: user.email as string,
      fullName: user.fullName as string,
      role: user.role as Role,
      avatarUrl: (user.avatarUrl as string | null) ?? undefined,
      createdAt: user.createdAt as string,
    })),
    meta: result.meta,
  };
}

export async function getUserById(
  id: string,
  signal?: AbortSignal,
): Promise<UserDetails> {
  const response = await fetch(`${APP_CONFIG.apiUrl}/v1/users/${encodeURIComponent(id)}`, {
    credentials: "include",
    signal,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new UsersApiError(
      response.status,
      typeof body.message === "string" ? body.message : response.statusText,
    );
  }

  const result = await response.json();
  const user = result?.data;
  if (
    result?.success !== true ||
    !user ||
    typeof user.id !== "string" ||
    user.id !== id ||
    typeof user.email !== "string" ||
    typeof user.fullName !== "string" ||
    !isRole(user.role) ||
    (user.avatarUrl != null && typeof user.avatarUrl !== "string") ||
    (user.createdAt != null &&
      (typeof user.createdAt !== "string" || !Number.isFinite(Date.parse(user.createdAt)))) ||
    (user.permissions != null &&
      (typeof user.permissions !== "object" || Array.isArray(user.permissions)))
  ) {
    throw new Error("The user detail API returned data in an unexpected format.");
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    avatarUrl: user.avatarUrl ?? undefined,
    createdAt: user.createdAt ?? undefined,
    permissions: user.permissions ?? undefined,
  };
}

export async function updateUserRole(
  id: string,
  role: Role,
): Promise<UpdatedUserRole> {
  const response = await fetch(`${APP_CONFIG.apiUrl}/v1/users/${encodeURIComponent(id)}/role`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new UsersApiError(
      response.status,
      typeof body.message === "string" ? body.message : response.statusText,
    );
  }

  const result = await response.json();
  const user = result?.data;
  if (
    result?.success !== true ||
    !user ||
    user.id !== id ||
    typeof user.email !== "string" ||
    typeof user.fullName !== "string" ||
    user.role !== role ||
    (user.avatarUrl != null && typeof user.avatarUrl !== "string")
  ) {
    throw new Error("The role update API returned data in an unexpected format.");
  }
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    avatarUrl: user.avatarUrl ?? undefined,
  };
}
