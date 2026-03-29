---
status: pending
priority: p2
issue_id: "005"
tags: [code-review, security]
dependencies: []
---

# SSRF Risk in Bookmark Import

## Problem Statement

The `fetch_url_metadata` function makes HTTP requests to user-provided URLs without validating the URL scheme or blocking private IP ranges.

**Why it matters:** An attacker could use bookmark import to scan internal networks or access cloud metadata endpoints.

## Findings

**Location:** `src-tauri/src/commands/import.rs:297-310`
```rust
async fn fetch_url_metadata(url: &str) -> Result<(Option<String>, Option<String>), String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    let response = client
        .get(url)  // No validation on URL!
        .send()
        .await?;
}
```

**Missing protections:**
- URL scheme validation (could allow `file://`, `gopher://`)
- Private IP blocking (localhost, 10.x.x.x, 192.168.x.x)
- Redirect limits to internal resources
- Cloud metadata endpoint blocking (169.254.169.254)

## Proposed Solutions

### Option A: Comprehensive URL validation (Recommended)
```rust
fn validate_url(url: &str) -> Result<Url, String> {
    let parsed = Url::parse(url).map_err(|_| "Invalid URL")?;

    // Only allow http/https
    if !["http", "https"].contains(&parsed.scheme()) {
        return Err("Only HTTP/HTTPS URLs allowed".into());
    }

    // Block private IPs
    if let Some(host) = parsed.host() {
        if is_private_ip(&host) {
            return Err("Private IP addresses not allowed".into());
        }
    }

    Ok(parsed)
}
```
- **Pros:** Comprehensive protection
- **Cons:** More code, may block legitimate internal resources
- **Effort:** Medium
- **Risk:** Low

### Option B: Disable redirects and limit timeout
- Set `redirect(Policy::none())`
- Reduce timeout further
- **Pros:** Quick partial fix
- **Cons:** Doesn't address core issue
- **Effort:** Low
- **Risk:** Medium (incomplete)

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected files:**
- `src-tauri/src/commands/import.rs`

## Acceptance Criteria

- [ ] Only http:// and https:// URLs accepted
- [ ] Private IP ranges blocked (127.0.0.1, 10.x, 172.16-31.x, 192.168.x)
- [ ] Cloud metadata endpoints blocked
- [ ] Legitimate bookmarks still work

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-19 | Created from code review | Security Sentinel identified SSRF risk |

## Resources

- PR: #1
- [OWASP SSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
