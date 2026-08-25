---
"@emdash-cms/plugin-cli": patch
"@emdash-cms/registry-client": patch
---

Adds internal engineering conformance tooling for validating the delegated release service's exact create-only PDS scope. The hidden command never falls back to broad `transition:generic` authority and emits redacted evidence for authorization, refresh, and revocation runs.
