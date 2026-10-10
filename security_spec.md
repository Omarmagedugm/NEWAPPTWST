# Security Specification for Ittihad Fan App

## 1. Data Invariants
- A user profile can only be created by the authenticated user with the matching UID.
- Only users with the `admin` role can modify the `settings`, `news`, and `matches` collections.
- `role` in user profile is immutable via client-side update (except by admins).
- All timestamps must be server-generated.

## 2. The "Dirty Dozen" Payloads (Denial Tests)
1. **Identity Spoofing**: Attempt to create a user profile with `uid` that doesn't match `request.auth.uid`.
2. **Privilege Escalation**: A regular user attempted to update their own `role` to `admin`.
3. **Ghost Field Injection**: Adding an `isVerified: true` field to a user profile by a non-admin.
4. **Settings Hijack**: Non-admin attempting to change the `appLogo` in the `settings` collection.
5. **News Vandalism**: Non-admin attempting to delete a news article.
6. **Score Manipulation**: Non-admin attempting to update a match score.
7. **Immutable Field Attack**: Attempting to change `joinDate` after creation.
8. **ID Poisoning**: Using a 1MB string as a document ID for a new news article.
9. **Timestamp Fraud**: Providing a client-side date for `createdAt` instead of `request.time`.
10. **Orphaned News**: Creating a news article with a non-existent category.
11. **PII Leak**: Non-admin user attempting to read another user's private data (if any).
12. **Blanket List Query**: Authenticated user trying to list all users without a filter.

## 3. Test Runner
A `firestore.rules.test.ts` will be created to verify these constraints.
