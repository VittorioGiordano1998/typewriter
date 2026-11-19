---
id: DG-VITTORIOGIORDANO-001
owner: VITTORIOGIORDANO
status: Open
release_impact: High
related: []
superseded_by: null
---

# Delivery Gap: Disable public signup in Supabase project

## Description

The application no longer offers signup, but direct Supabase Auth signup must also be disabled in the hosted project to prevent public account creation. Project administration access is not available in this workspace.

## Notes

In Supabase Auth settings, disable Allow new users to sign up and verify an unauthenticated signup is rejected while existing users can sign in.
