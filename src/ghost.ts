// src/ghost.ts

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const buffer = new ArrayBuffer(hex.length / 2);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function base64url(data: Uint8Array | string): string {
  const str =
    typeof data === "string"
      ? btoa(data)
      : btoa(Array.from(data, (b) => String.fromCharCode(b)).join(""));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function createJwt(
  keyId: string,
  secret: string
): Promise<string> {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT", kid: keyId }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({ iat: now, exp: now + 300, aud: "/admin/" })
  );

  const signingInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    hexToBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signingInput))
  );

  return `${signingInput}.${base64url(sig)}`;
}

interface GhostError {
  message: string;
  type: string;
  context?: string;
}

export class GhostClient {
  readonly baseUrl: string;
  readonly keyId: string;
  readonly keySecret: string;

  constructor(
    siteUrl: string,
    apiKey: string,
    private apiVersion: string
  ) {
    const parts = apiKey.split(":");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error("Invalid API key format. Expected 'id:secret'.");
    }
    this.keyId = parts[0];
    this.keySecret = parts[1];

    // Normalize: remove trailing slash from siteUrl
    const base = siteUrl.replace(/\/+$/, "");
    this.baseUrl = `${base}/ghost/api/admin/`;
  }

  private async headers(): Promise<Record<string, string>> {
    const token = await createJwt(this.keyId, this.keySecret);
    return {
      Authorization: `Ghost ${token}`,
      "Accept-Version": this.apiVersion,
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = await this.headers();
    const res = await fetch(url, {
      method,
      headers: {
        ...headers,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => null);
      const errors = (errorBody as { errors?: GhostError[] })?.errors;
      if (errors?.length) {
        const e = errors[0]!;
        throw new Error(
          `Ghost API error (${e.type}): ${e.message}${e.context ? ` — ${e.context}` : ""}`
        );
      }
      throw new Error(`Ghost API returned ${res.status}: ${res.statusText}`);
    }

    if (res.status === 204) return {} as T;
    return (await res.json()) as T;
  }

  async listPosts(options?: {
    filter?: string;
    limit?: number;
    page?: number;
    order?: string;
  }): Promise<{ posts: any[]; meta: any }> {
    const params = new URLSearchParams({ formats: "lexical" });
    if (options?.filter) params.set("filter", options.filter);
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.page) params.set("page", String(options.page));
    if (options?.order) params.set("order", options.order);
    return this.request("GET", `posts/?${params}`);
  }

  async getPost(idOrSlug: string): Promise<{ posts: any[] }> {
    const params = new URLSearchParams({ formats: "lexical" });
    // Ghost object IDs are 24-char hex strings
    const isId = /^[a-f0-9]{24}$/.test(idOrSlug);
    const path = isId
      ? `posts/${idOrSlug}/?${params}`
      : `posts/slug/${idOrSlug}/?${params}`;
    return this.request("GET", path);
  }

  async createPost(data: {
    title: string;
    lexical?: string;
    status?: string;
    tags?: { name: string }[];
    custom_excerpt?: string;
  }): Promise<{ posts: any[] }> {
    return this.request("POST", "posts/", {
      posts: [{ ...data, source: "api" }],
    });
  }

  async updatePost(
    id: string,
    data: {
      updated_at: string;
      title?: string;
      lexical?: string;
      status?: string;
      tags?: { name: string }[];
      custom_excerpt?: string;
    }
  ): Promise<{ posts: any[] }> {
    return this.request("PUT", `posts/${id}/?save_revision=true`, {
      posts: [data],
    });
  }

  async deletePost(id: string): Promise<void> {
    await this.request("DELETE", `posts/${id}/`);
  }
}
