# Foldercraft User Flow (Simple Guide)

This guide explains how a user typically uses `foldercraft` from start to finish, in simple terms.

- npm package: `foldercraft`
- command name: `foldercraft`

---

## 1) Install and check

Install globally:

```bash
npm install -g foldercraft
```

Confirm it works:

```bash
foldercraft --help
```

---

## 2) Pick how you want to start

`foldercraft` has 4 ways to start a structure:

1. Framework template (`react`, `node`, `next`)
2. Custom JSON config
3. Framework + custom config together (`--extend`)
4. Empty mode (`--empty`) and build from scratch

---

## 3) Basic generation flow (most common)

Create folders/files from a framework:

```bash
foldercraft --framework react --path ./my-app
```

What happens:

1. `foldercraft` loads the React template
2. checks your target path
3. applies extra options (if any)
4. writes the final structure to disk

---

## 4) Safe preview before writing (recommended)

Use dry run first:

```bash
foldercraft --framework react --path ./my-app --dry-run
```

What happens in dry run:

- shows what it *would* create/change
- does not write anything to your filesystem

---

## 5) Customize what gets generated

You can adjust the final structure during the same command.

### Add extra folders

```bash
foldercraft --framework react --path ./my-app --add-dir src/features src/shared
```

### Add extra files

```bash
foldercraft --framework react --path ./my-app --add-file .env .env.example
```

### Set file content

```bash
foldercraft --framework react --path ./my-app --set-file README.md::"# My App"
```

### Remove folders/files from output

```bash
foldercraft --framework react --path ./my-app --remove tests src/pages
```

Optional strict validation for remove paths:

```bash
foldercraft --framework react --path ./my-app --remove tests --strict
```

With `--strict`, command fails if a remove path does not exist in the final plan.

---

## 6) Use your own JSON structure

If you want full control, use a config file:

```bash
foldercraft --config ./my-structure.json --path ./custom-project
```

Simple schema rules:

- object `{}` = directory
- `"file"` = empty file
- any other string = file content
- `{ "$file": "text" }` = explicit file
- `{ "$dir": { ... } }` = explicit directory

---

## 7) Combine framework + your config

Use `--extend` to merge your custom config with a framework template:

```bash
foldercraft --framework react --config ./overrides.json --extend --path ./app
```

Use this when you want a standard template plus your team/project extras.

---

## 8) Choose existing-folder behavior

When target path already exists, pick one behavior:

- default: fail (safe default)
- `--merge`: keep existing files, add missing ones
- `--overwrite`: delete and recreate

Examples:

```bash
foldercraft --framework node --path ./api --merge
foldercraft --framework next --path ./web --overwrite
```

Note: `--merge` and `--overwrite` cannot be used together.

---

## 9) Use interactive mode (wizard)

Run wizard mode:

```bash
foldercraft --interactive
```

Wizard helps users step-by-step by asking:

- framework/config/empty mode
- target path and write behavior
- dry-run/strict/verbose toggles
- extra dirs/files/file contents/remove paths

Great for beginners or one-off setups.

---

## 10) Save and reuse profiles

Profiles store your favorite command options.

### Save a profile

```bash
foldercraft --framework react --add-dir src/features --add-file .env --save-profile react-base
```

### Reuse a profile

```bash
foldercraft --profile react-base --path ./client-a
```

### Manage profiles

```bash
foldercraft --list-profiles
foldercraft --delete-profile react-base
```

---

## 11) Complete real-world user flow

Here is a practical, full flow:

1. Install package
2. Run `foldercraft --help` once
3. Start with template + dry run
4. Add/remove custom nodes
5. Run actual generation
6. Save as profile if you will repeat this setup

Example:

```bash
foldercraft --framework react --path ./client \
  --add-dir src/features src/shared \
  --add-file .env \
  --remove tests \
  --dry-run
```

If preview looks correct, run again without `--dry-run`.

---

## 12) Quick feature map

- **Template generation**: start fast with React/Node/Next
- **Custom config**: define exact structure in JSON
- **Extend mode**: merge template + custom config
- **Empty mode**: create only what you explicitly add
- **Add/Set/Remove tools**: shape output in one command
- **Dry run**: safe preview before write
- **Merge/Overwrite modes**: control behavior for existing folders
- **Interactive mode**: guided setup with prompts
- **Profiles**: save and reuse repeated setups

---

## 13) Beginner-safe command pattern

Use this pattern whenever unsure:

1. run with `--dry-run`
2. check output
3. rerun without `--dry-run`

Example:

```bash
foldercraft --framework node --path ./new-api --dry-run
foldercraft --framework node --path ./new-api
```

This gives you speed and safety together.



