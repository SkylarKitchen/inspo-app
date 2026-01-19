---
status: pending
priority: p2
issue_id: "004"
tags: [code-review, security]
dependencies: []
---

# Excessive Asset Protocol Scope

## Problem Statement

The asset protocol scope grants read access to nearly the entire user's home directory, including sensitive config files, SSH keys, browser profiles, etc.

**Why it matters:** If an attacker can influence asset URLs, they could potentially exfiltrate sensitive files.

## Findings

**Location:** `src-tauri/tauri.conf.json:33-45`
```json
"assetProtocol": {
  "scope": {
    "allow": [
      "$HOME/**",
      "$HOME/.*/**",
      "/Users/**",
      "/Users/*/.*/**",
      "/Users/*/**/.*/**"
    ]
  }
}
```

This allows access to:
- `~/.ssh/` (SSH keys)
- `~/.config/` (app credentials)
- Browser profiles and saved passwords
- Any file under /Users/

## Proposed Solutions

### Option A: Restrict to library directory only (Recommended)
- Dynamically scope to opened library path
- Or use a fixed "Inspo Libraries" location
```json
"allow": ["$DOCUMENT/Inspo Libraries/**"]
```
- **Pros:** Minimum necessary access
- **Cons:** May need runtime scope updates when opening different libraries
- **Effort:** Medium
- **Risk:** Low

### Option B: Restrict to known safe directories
- Only allow Documents, Pictures, Downloads
- Exclude hidden directories
- **Pros:** Broader access while excluding sensitive areas
- **Cons:** Still broader than necessary
- **Effort:** Low
- **Risk:** Medium

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected files:**
- `src-tauri/tauri.conf.json`
- `src-tauri/capabilities/default.json`

## Acceptance Criteria

- [ ] Asset scope limited to library directories
- [ ] Cannot access ~/.ssh or other sensitive paths
- [ ] Images still load correctly from library
- [ ] Opening libraries in different locations works

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-19 | Created from code review | Security Sentinel rated high severity |

## Resources

- PR: #1
- [Tauri Asset Protocol](https://tauri.app/v1/api/config/#asset-protocol)
