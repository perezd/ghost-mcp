# @perezd/ghost-mcp

MCP server for managing Ghost blog posts via the Admin API. Lexical format only.

## Setup

```bash
bunx @perezd/ghost-mcp auth
```

Prompts for your Ghost site URL and Admin API key. Find your Admin API key in Ghost Admin under Settings > Integrations.

## Usage

Start the MCP server (stdio transport):

```bash
bunx @perezd/ghost-mcp serve
```

Use a specific site (only if authenticated to multiple):

```bash
bunx @perezd/ghost-mcp serve --url https://staging.myblog.com
```

## Tools

- **list_posts** — List/filter posts with NQL queries
- **get_post** — Get a post by ID or slug
- **create_post** — Create a new post (lexical format, defaults to draft)
- **update_post** — Update a post (requires updated_at for collision detection)
- **delete_post** — Delete a post by ID
