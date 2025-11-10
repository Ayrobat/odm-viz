# ODM Viz
<img width="2391" height="1172" alt="image" src="https://github.com/user-attachments/assets/9416ba9a-8126-4ad5-87ca-f3e1ddc665a6" />

Just a personal sandbox mashing together turborepo, r3f, wasm and more. Currently focused on 3D viz for point clouds. Currently provides a simple `.LAZ` file decoder with a pipeline to a real-time point cloud viewer.

- **Turborepo** for optimized monorepo management
- **WebAssembly** via Emscripten for near-native performance
- **LASzip/LAZ** for efficient point cloud compression
- **Three.js & React Three Fiber** for declarative 3D rendering

The current MVP features a `.LAZ` file decoder with a real-time point cloud viewer, serving as a foundation for future 3D geospatial visualization tools.

## Architecture & Technology Stack

This project is structured as a **Turborepo Monorepo** using **pnpm** for package management, optimized for caching and build efficiency.

| Category             | Component                                   | Notes                                                        |
| :------------------- | :------------------------------------------ | :----------------------------------------------------------- |
| **Frontend**         | React 18, TypeScript                        | Strict typing across all packages.                           |
| **Rendering**        | Three.js, React Three Fiber (R3F)           | Declarative 3D scene management.                             |
| **Native Toolchain** | Emscripten SDK (via Docker)                 | Provides a reproducible WASM build environment.              |
| **WASM Dependency**  | LASzip/LASlib                               | Core LAZ decompression libraries. Sourced via Git Submodule. |
| **Tooling**          | Turborepo, Changesets, Conventional Commits | Standardized release and commit quality workflows.           |

### Key Packages

| Package               | Role                                                                                      |
| :-------------------- | :---------------------------------------------------------------------------------------- |
| `packages/wasm`       | **WASM Producer:** C++ source for LAZ/LASlib APIs. Built via Docker.                      |
| `packages/laz-loader` | **WASM Consumer:** Handles module initialization and provides the data loading component. |
| `packages/core`       | Shared TypeScript types, utility functions, and data models.                              |
| `apps/demo`           | Client application consuming internal packages.                                           |

---

## Getting Started

### Prerequisites

1.  **Node.js 18+ with Corepack**
    - Enable once per Node installation:
      ```bash
      corepack enable
      ```
    - This repo pins pnpm via `packageManager` in `package.json`. Corepack will select that version.
2.  **Docker**
    - Docker Desktop must be running to build the WASM module (Emscripten lives in the Docker image).
3.  **Git Submodules**
    - Fetch external source code dependencies (LASzip/LASlib):
      ```bash
      git submodule update --init --recursive
      ```

### First-Time Environment Setup

1.  Install dependencies:
    ```bash
    pnpm install
    ```
2.  Build the WASM artifact (runs Docker buildx and emits to `packages/wasm/dist`):
    ```bash
    pnpm --filter @odm-viz/wasm build
    ```
3.  Build all packages (TypeScript bundles):
    ```bash
    pnpm build
    ```
4.  Start the demo app:
    ```bash
    pnpm dev
    ```

---

## Development Workflow

This project enforces a **Conventional Commits** standard and uses **Changesets** for release management.

| Command                     | Description                                                                            | Notes                                                                                                                                                                                               |
| :-------------------------- | :------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm build`                | Compiles all packages.                                                                 | Uses Turborepo caching.                                                                                                                                                                             |
| `pnpm typecheck`            | Runs the TypeScript compiler check across the monorepo.                                |                                                                                                                                                                                                     |
| `pnpm lint`                 | Executes ESLint and Prettier checks.                                                   |                                                                                                                                                                                                     |
| `git commit`                | **Triggers husky hooks** for `lint-staged` (pre-commit) and `commitlint` (commit-msg). | Must follow **Conventional Commit** spec (e.g., `feat: add new feature`). Note: If you encounter husky deprecation warnings, please refer to the official husky documentation for the latest setup. |
| `pnpm changeset`            | Creates a release entry (if using Changesets).                                         | Run before publishing PRs that change public API.                                                                                                                                                   |
| `pnpm publish -r --dry-run` | Dry-run publish across workspaces.                                                     | Validate package contents before a real publish.                                                                                                                                                    |

---

## Release & Publishing Workflow

### Versioning with Changesets

1. Create a changeset for user-visible changes:
   ```bash
   pnpm changeset
   ```
2. Bump versions and update changelogs:
   ```bash
   pnpm changeset version
   ```
3. Commit the version bump:
   ```bash
   git add -A && git commit -m "chore(release): version packages"
   ```

### Dry run and Publish (manual)

1. Build wasm and packages:
   ```bash
   pnpm build:wasm && pnpm build
   ```
2. Dry run publish across workspaces:
   ```bash
   pnpm publish -r --dry-run
   ```
3. Publish (when ready):
   ```bash
   pnpm publish -r --access public
   ```

### Tags

- Tag after publishing (optional but recommended):
  ```bash
  git tag -a v0.1.0 -m "v0.1.0"
  git push --tags
  ```

### CI

- CI builds wasm first, then runs lint, typecheck, tests, and package builds.
- A separate release workflow can be added later to publish on tags. See TODO.md.

---

## Usage

- `@odm-viz/wasm` exposes a function to decode LAZ into typed arrays. The Emscripten module is single-file JS for simple hosting.
- `@odm-viz/laz-loader` provides a React component `LAZModel` to fetch/decode and display point clouds in Three.js via React Three Fiber.

---

## First Commit Checklist

- Initialize repo and submodules:
  ```bash
  git init
  corepack enable
  pnpm install
  git submodule update --init --recursive
  git add -A
  git commit -m "chore: initial commit"
  # Create remote repo, then:
  git branch -M main
  git remote add origin <git-url>
  git push -u origin main
  ```
- Verify local build:
  ```bash
  pnpm --filter @odm-viz/wasm build
  pnpm build
  pnpm -C apps/demo dev
  ```
- Confirm pre-commit hooks (lint-staged) and commitlint are active.
- Open a PR template and CODEOWNERS (TBD) before first external contributions.

## Licensing

This project is licensed under the **MIT License** (see `LICENSE.txt`).

The included **LASzip** and **LASlib** libraries are dual-licensed. The source code used for the WASM component is considered governed by the **LGPL 2.1** and **Apache 2.0** terms. Full license texts and attribution notices are provided in the `licenses/` directory.
