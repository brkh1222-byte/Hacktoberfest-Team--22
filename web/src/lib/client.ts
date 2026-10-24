import { mn } from "./i18n/mn";
import type { GenerationInput, GenerationResult, SaveGeneration, SetUpdate } from "./schema";
import type { ExerciseSet, SetPage, Teacher } from "./db/types";

export class ClientError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export type TokenProvider = () => Promise<string | null>;
export function createApi(baseUrl: string, getToken: TokenProvider) {
  async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    const token = await getToken();
    if (!token) throw new ClientError(401, mn.unauthorized);
    let response: Response;
    try {
      const options: RequestInit = {
        method,
        cache: "no-store",
        credentials: "omit",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        },
      };
      if (body !== undefined) options.body = body instanceof FormData ? body : JSON.stringify(body);
      response = await fetch(`${baseUrl}/api${path}`, options);
    } catch {
      throw new ClientError(0, mn.networkError);
    }
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : mn.error;
      throw new ClientError(response.status, message);
    }
    return data as T;
  }
  return {
    profile: () => request<Teacher>("/me"),
    list: (parameters: URLSearchParams) => request<SetPage>(`/sets?${parameters}`),
    get: (id: string) => request<ExerciseSet>(`/sets/${id}`),
    update: (id: string, input: SetUpdate) => request<ExerciseSet>(`/sets/${id}`, "PATCH", input),
    delete: (id: string) => request<{ success: boolean }>(`/sets/${id}`, "DELETE"),
    generate: (input: GenerationInput) => request<GenerationResult>("/generate", "POST", input),
    saveGeneration: (input: SaveGeneration) =>
      request<{ in_class_set_id: string; homework_set_id: string }>("/generations", "POST", input),
    upload: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return request<{ pdfFileId: string }>("/uploads", "POST", form);
    },
    copy: (id: string) => request<{ id: string }>(`/sets/${id}/copy`, "POST"),
    rate: (id: string, stars: number) =>
      request<{ success: boolean }>(`/sets/${id}/rating`, "POST", { stars }),
  };
}
export type HomeworkApi = ReturnType<typeof createApi>;
export const errorMessage = (error: unknown) =>
  error instanceof ClientError ? error.message : mn.error;
