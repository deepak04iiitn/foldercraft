# NPM Publish Guide for `foldercraft`

This guide explains the complete process to publish `foldercraft` to npm, step by step.

---

## 1) Prerequisites

Make sure you have:

- Node.js 20+ (`node -v`)
- npm installed (`npm -v`)
- An npm account (https://www.npmjs.com/signup)
- Access to this project locally

Check current package name and version:

```bash
npm pkg get name version
```

Expected package name is:

- `foldercraft`

---

## 2) Install dependencies

From project root:

```bash
npm install
```

---

## 3) Login to npm

Login from terminal:

```bash
npm login
```

Verify logged in user:

```bash
npm whoami
```

If this fails, you are not authenticated yet.

---

## 4) Verify package can be published

Check if package name is available:

```bash
npm view foldercraft name
```

Possible outcomes:

- If it returns `foldercraft`, package already exists on npm.
- If it returns 404/not found, name is available.

If name is taken and not yours, change `name` in `package.json` before publishing.

---

## 5) Update version

Before each publish, bump version in `package.json`.

Choose one:

```bash
npm version patch   # 1.0.0 -> 1.0.1
npm version minor   # 1.0.0 -> 1.1.0
npm version major   # 1.0.0 -> 2.0.0
```

If you do not want git tag/commit from `npm version`, use:

```bash
npm version patch --no-git-tag-version
```

---

## 6) Run quality checks

Run checks manually:

```bash
npm run lint
npm test
npm run build
```

Important:

- This project already has `prepublishOnly` script:
  - `npm run lint && npm run test && npm run build`
- So `npm publish` will automatically run these checks again.

---

## 7) Preview published contents (very important)

See exactly what npm will upload:

```bash
npm pack --dry-run
```

For this project, only `dist` should be included (based on `files` in `package.json`).

---

## 8) Publish package

### First public publish

```bash
npm publish --access public
```

### Publish next versions

Use the same command:

```bash
npm publish --access public
```

---

## 9) Verify after publish

Check package metadata:

```bash
npm view foldercraft version
```

Install globally to test:

```bash
npm install -g foldercraft
foldercraft --help
```

---

## 10) Optional: tag-based releases

If you want pre-release channels:

```bash
npm publish --tag beta --access public
```

Install beta:

```bash
npm install -g foldercraft@beta
```

---

## 11) Common errors and fixes

### `403 Forbidden` / permission denied

- You are not owner/collaborator of package name.
- Run `npm whoami` and verify account.
- If package belongs to another account, rename package.

### `402 Payment Required` (for scoped packages)

- For private scoped packages, billing may be needed.
- For public package publishing, use `--access public`.

### Version already exists

- You cannot re-publish same version.
- Bump version and publish again.

### OTP / 2FA required

- npm may ask for one-time password.
- Enter OTP from authenticator app.

### Fails at `prepublishOnly`

- Fix lint/test/build errors, then retry publish.

---

## 12) Recommended release checklist

Use this quick checklist for every release:

1. Pull latest code
2. Update changelog/release notes (if you maintain one)
3. Run `npm install`
4. Bump version
5. Run lint/test/build
6. Run `npm pack --dry-run`
7. Run `npm publish --access public`
8. Verify with `npm view foldercraft version`
9. Install globally and run `foldercraft --help`

---

## 13) One-command publish (current project behavior)

Because `prepublishOnly` is configured, this command will automatically:

- lint
- test
- build
- then publish

```bash
npm publish --access public
```

---

## 14) Useful commands reference

```bash
npm whoami
npm pkg get name version
npm version patch
npm run lint
npm test
npm run build
npm pack --dry-run
npm publish --access public
npm view foldercraft version
```


