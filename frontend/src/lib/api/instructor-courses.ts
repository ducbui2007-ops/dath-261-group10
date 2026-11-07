import { apiClient } from "../api";

export interface CourseDeletionResponse {
  success: true;
  message?: string;
}

// Wire this only after course records come from the server, never for fixture slugs.
export async function deleteInstructorCourse(id: string): Promise<CourseDeletionResponse> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("A valid server course ID is required. No deletion request was sent.");
  }
  const response = await apiClient<CourseDeletionResponse>(`/v1/courses/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (response?.success !== true) throw new Error("The server did not confirm course deletion.");
  return response;
}
