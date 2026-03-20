# Dev Container Setup

This project uses a [dev container](https://containers.dev/) to provide a consistent, sandboxed development environment with Claude Code, Node 20, and GitHub CLI pre-installed.

## Prerequisites

On your host machine:

1. **Docker** — Docker Desktop or Docker Engine
2. **Dev Container CLI** — `npm install -g @devcontainers/cli`
3. **GitHub CLI** — authenticated via `gh auth login`
4. **Environment variables** — add to your `~/.bashrc` or `~/.zshrc`:
   ```bash
   export GITHUB_TOKEN=$(gh auth token)
   export GH_TOKEN=$(gh auth token)
   ```
5. **Docker network** — create the shared network (once):
   ```bash
   docker network create devcontainer-shared
   ```

## Starting the Dev Container

From the project root:

```bash
devcontainer up --workspace-folder .
```

This builds the container image (first run takes a few minutes), starts the container, configures the firewall, and sets up Git credentials.

## Getting a Shell

```bash
devcontainer exec --workspace-folder . zsh -l
```

This drops you into a zsh shell inside the container at `/workspace` (the project root).

## Running Claude Code

Once you have a shell inside the container:

```bash
claude --dangerously-skip-permissions
```

On first run you'll need to authenticate with your Anthropic account. Your Claude Code configuration (plugins, settings) is bind-mounted from your host's `~/.claude/` directory, so plugins and preferences carry over automatically.

## Rebuilding

After changes to `.devcontainer/devcontainer.json` or `.devcontainer/Dockerfile`, rebuild the container:

```bash
# Pick up config changes (uses Docker cache):
devcontainer up --workspace-folder . --remove-existing-container

# Full rebuild from scratch (no cache):
devcontainer up --workspace-folder . --remove-existing-container --build-no-cache
```

## What's in the Container

| Tool | Version | Source |
|------|---------|--------|
| Node.js | 20 | Base image |
| Claude Code | latest | npm |
| GitHub CLI | system | apt |
| Git + delta | system + 0.18.2 | apt + GitHub release |
| zsh + Powerlevel10k | system | zsh-in-docker |

## How It Works

- **Workspace** is bind-mounted from your host at `/workspace`
- **Claude config** (`~/.claude/`) is bind-mounted from your host, so plugins and settings persist across containers
- **GitHub auth** (`~/.config/gh/`) is bind-mounted from your host, and `gh auth setup-git` runs on container creation to configure Git credential forwarding
- **Firewall** is configured on every start (`postStartCommand`) to restrict outbound traffic to GitHub, npm, Anthropic, and VS Code marketplace only
- **GITHUB_TOKEN / GH_TOKEN** environment variables are forwarded from your host shell
- **Environment variables** from `.devcontainer/.env` are loaded into the container (copy `.env.example` to `.env` and add secrets)
