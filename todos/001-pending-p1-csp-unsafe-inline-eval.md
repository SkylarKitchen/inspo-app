---
status: pending
priority: p1
issue_id: "001"
tags: [code-review, security]
dependencies: []
---

# CSP Allows unsafe-inline and unsafe-eval

## Problem Statement

The Content Security Policy in `tauri.conf.json` includes `'unsafe-inline'` and `'unsafe-eval'` in the `default-src` directive, effectively disabling XSS protections.

**Why it matters:** If an attacker can inject content into the webview (e.g., via malicious bookmark metadata), they could execute arbitrary JavaScript in the application context.

## Findings

**Location:** `src-tauri/tauri.conf.json:30`

```json
"csp": "default-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' asset: http://asset.localhost blob: data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:;"
```

**Issues:**
- `'unsafe-inline'` allows inline script execution
- `'unsafe-eval'` allows dynamic code evaluation via `eval()`, `Function()`, etc.
- Combined with stored data from bookmarks, this creates XSS risk

## Proposed Solutions

### Option A: Remove unsafe directives entirely (Recommended)
- Remove `'unsafe-inline'` and `'unsafe-eval'` from CSP
- Use nonces or hashes for any legitimate inline scripts
- **Pros:** Maximum security
- **Cons:** May require refactoring if React hydration relies on these
- **Effort:** Medium
- **Risk:** Low if tested thoroughly

### Option B: Use Tauri's isolation pattern
- Enable Tauri's process isolation
- Restrict script sources more tightly
- **Pros:** Defense in depth
- **Cons:** More complex configuration
- **Effort:** Medium-High
- **Risk:** Low

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected files:**
- `src-tauri/tauri.conf.json`

**Testing required:**
- Verify app loads correctly after CSP changes
- Test React hydration works without unsafe directives
- Test all dynamic features (dialogs, context menus, etc.)

## Acceptance Criteria

- [ ] CSP does not include `'unsafe-inline'` or `'unsafe-eval'`
- [ ] App functions correctly with stricter CSP
- [ ] No console errors related to blocked scripts
- [ ] All UI interactions work as expected

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-19 | Created from code review | Security Sentinel identified CSP as critical issue |

## Resources

- PR: #1
- [Tauri Security Best Practices](https://tauri.app/v1/guides/security/security/)
- [MDN CSP Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
