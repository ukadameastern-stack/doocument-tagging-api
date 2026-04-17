# Build Instructions — orders-api

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 20.x LTS | `node --version` to verify |
| npm | 10.x | Bundled with Node.js 20 |
| TypeScript | 5.x | Installed via devDependencies |
| esbuild | 0.x | Installed via devDependencies |
| AWS CDK CLI | 2.x | `npm install -g aws-cdk` for deployments |

**Environment variables**: Copy `.env.example` to `.env` and fill in local values before running locally.

---

## Build Steps

### 1. Install Application Dependencies

```bash
cd /home/udaysinhkadam/workspace/ai/doocument-tagging-api
npm install
```

**Expected output**: `added N packages` with no audit errors (run `npm audit` to verify — SECURITY-10).

### 2. Install CDK Infrastructure Dependencies

```bash
cd infra
npm install
cd ..
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your local MongoDB URI, Redis URL, and JWT secret
```

For non-dev environments, secrets are loaded from AWS Secrets Manager automatically — no `.env` needed.

### 4. TypeScript Type Check

```bash
npx tsc --noEmit
```

**Expected output**: No errors. Fix any type errors before proceeding.

### 5. Lint

```bash
npm run lint
```

**Expected output**: No ESLint errors or warnings.

### 6. Build Lambda Bundle

```bash
npm run build
```

**What this does**:
1. Runs `tsc --noEmit` (type check)
2. Runs `esbuild src/server.ts --bundle --platform=node --target=node20 --outfile=dist/server.js`

**Expected output**:
```
dist/server.js  XXX kb
```

**Build artifacts**:
- `dist/server.js` — single bundled Lambda handler (all dependencies inlined, tree-shaken)

### 7. Build CDK Infrastructure

```bash
cd infra
npx tsc --noEmit
cd ..
```

---

## Troubleshooting

### `Cannot find module` errors
- Run `npm install` again
- Verify `node_modules` exists at workspace root

### TypeScript errors
- Run `npx tsc --noEmit` to see all errors
- Check `tsconfig.json` `strict` settings
- Ensure all imports use correct paths

### esbuild bundle too large (> 50MB)
- Check for accidentally bundled `aws-sdk` — it should be `--external:@aws-sdk/*`
- Run `npx esbuild --bundle --analyze src/server.ts` to inspect bundle contents

### CDK synth fails
```bash
cd infra && npx cdk synth --context deployEnv=dev
```
- Verify `infra/node_modules` exists
- Check `cdk.json` context values
