// src/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GhostClient } from "./ghost.ts";

export function createServer(client: GhostClient): McpServer {
  const server = new McpServer({
    name: "ghost-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "list_posts",
    {
      title: "List Posts",
      description:
        "List posts from Ghost with optional NQL filtering, pagination, and ordering.",
      inputSchema: z.object({
        filter: z.string().optional().describe("NQL filter string (e.g. 'tag:news+status:published')"),
        limit: z.number().default(15).describe("Number of posts per page"),
        page: z.number().default(1).describe("Page number"),
        order: z.string().optional().describe("Sort order (e.g. 'published_at desc')"),
      }),
    },
    async ({ filter, limit, page, order }) => {
      try {
        const result = await client.listPosts({ filter, limit, page, order });
        const summaries = result.posts.map((p: any) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          status: p.status,
          published_at: p.published_at,
          updated_at: p.updated_at,
          excerpt: p.excerpt,
        }));
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ posts: summaries, meta: result.meta }, null, 2) }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );

  server.registerTool(
    "get_post",
    {
      title: "Get Post",
      description:
        "Get a single Ghost post by ID (24-char hex) or slug. Returns full post with lexical content.",
      inputSchema: z.object({
        id_or_slug: z.string().describe("Post ID (24-char hex) or slug"),
      }),
    },
    async ({ id_or_slug }) => {
      try {
        const result = await client.getPost(id_or_slug);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result.posts[0], null, 2) }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );

  server.registerTool(
    "create_post",
    {
      title: "Create Post",
      description:
        "Create a new Ghost post. Content must be in lexical JSON format. Defaults to draft status.",
      inputSchema: z.object({
        title: z.string().describe("Post title"),
        lexical: z.string().optional().describe("Post content as lexical JSON string"),
        status: z.enum(["draft", "published", "scheduled"]).default("draft").describe("Post status"),
        tags: z.array(z.string()).optional().describe("Tag names to assign"),
        custom_excerpt: z.string().optional().describe("Custom excerpt for the post"),
      }),
    },
    async ({ title, lexical, status, tags, custom_excerpt }) => {
      try {
        const result = await client.createPost({
          title,
          lexical,
          status,
          tags: tags?.map((name) => ({ name })),
          custom_excerpt,
        });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result.posts[0], null, 2) }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );

  server.registerTool(
    "update_post",
    {
      title: "Update Post",
      description:
        "Update an existing Ghost post. Requires updated_at for collision detection. Content must be lexical JSON.",
      inputSchema: z.object({
        id: z.string().describe("Post ID (24-char hex)"),
        updated_at: z.string().describe("Current updated_at value for optimistic locking"),
        title: z.string().optional().describe("New title"),
        lexical: z.string().optional().describe("New content as lexical JSON string"),
        status: z.enum(["draft", "published", "scheduled"]).optional().describe("New status"),
        tags: z.array(z.string()).optional().describe("New tag names (replaces existing)"),
        custom_excerpt: z.string().optional().describe("Custom excerpt for the post"),
      }),
    },
    async ({ id, updated_at, title, lexical, status, tags, custom_excerpt }) => {
      try {
        const result = await client.updatePost(id, {
          updated_at,
          title,
          lexical,
          status,
          tags: tags?.map((name) => ({ name })),
          custom_excerpt,
        });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result.posts[0], null, 2) }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );

  server.registerTool(
    "delete_post",
    {
      title: "Delete Post",
      description: "Delete a Ghost post by ID.",
      inputSchema: z.object({
        id: z.string().describe("Post ID (24-char hex)"),
      }),
    },
    async ({ id }) => {
      try {
        await client.deletePost(id);
        return {
          content: [{ type: "text" as const, text: `Post ${id} deleted.` }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );

  return server;
}
