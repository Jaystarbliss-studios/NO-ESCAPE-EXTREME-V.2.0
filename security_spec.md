# Security Specification — NO ESCAPE (Firebase Firestore)

## 1. Data Invariants & Relationship Mapping

1. **Master Source of Truth**:
   - `/users/{userId}`: Strictly private per-user campaign progression and unlocked cosmetic inventory. Only the authenticated owner (`request.auth.uid == userId` with `request.auth.token.email_verified == true`) can read (`get`), `create`, or `update` their own profile document. No `list` or `delete` operations are allowed on `/users`. No PII (`email`, `phone`, `address`) is stored in `/users/{userId}`.
   - `/dailyLeaderboards/{entryId}`: Canonical daily speedrun entries where `entryId` must equal `incoming().dateKey + '_' + request.auth.uid`.
     - **Creation invariant**: Requires verified authenticated user (`request.auth.token.email_verified == true`), valid `entryId` matching `dateKey + '_' + request.auth.uid`, `incoming().uid == request.auth.uid`, `incoming().isPublic == true`, `incoming().createdAt == request.time`, and `incoming().updatedAt == request.time`.
     - **Update invariant**: Only the owner (`existing().uid == request.auth.uid`) can update their entry, immutable fields (`uid`, `dateKey`, `seed`, `createdAt`, `isPublic`) must remain unchanged, and `incoming().clearTimeMs <= existing().clearTimeMs` (only faster or equal personal best times may overwrite a record).
     - **Query Enforcer (`get` / `list`)**: `allow get: if isValidId(entryId) && resource.data.isPublic == true;` and `allow list: if resource.data.isPublic == true;` so every query is evaluated against `resource.data.isPublic == true`.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 (Identity Spoofing on `/users/{userId}`)**: Authenticated user `user_A` attempts to create `/users/user_B` with `uid: "user_B"`. -> `PERMISSION_DENIED`.
2. **Payload 2 (Unverified Email Write)**: User with `email_verified: false` attempts to write to `/users/user_A`. -> `PERMISSION_DENIED`.
3. **Payload 3 (Shadow Field Injection on `/users/{userId}`)**: Payload includes all required fields plus ghost field `"isAdmin": true`. -> `PERMISSION_DENIED` via `.keys().hasOnly(...)`.
4. **Payload 4 (Value Poisoning on `highestUnlockedLevel`)**: User sends `highestUnlockedLevel: 999` (exceeds max 100) or negative `coins: -50`. -> `PERMISSION_DENIED`.
5. **Payload 5 (Unbounded Array Exhaustion)**: User sends `completedLevels` with 500 elements (exceeds max 100) or `unlockedCosmetics` with 50 elements (exceeds max 20). -> `PERMISSION_DENIED`.
6. **Payload 6 (Cross-User Read on `/users/{userId}`)**: Authenticated user `user_A` attempts `get` or `list` on `/users/user_B`. -> `PERMISSION_DENIED`.
7. **Payload 7 (ID Poisoning on `/dailyLeaderboards/{entryId}`)**: Authenticated user `user_A` attempts to create `/dailyLeaderboards/2026-11-13_user_B` to overwrite `user_B`'s daily score. -> `PERMISSION_DENIED` because `entryId == incoming().dateKey + '_' + request.auth.uid` fails.
8. **Payload 8 (Timestamp Forgery)**: Client sends forged past `createdAt` or `updatedAt` != `request.time`. -> `PERMISSION_DENIED`.
9. **Payload 9 (Immortal Field Mutation on Update)**: Owner updates `/dailyLeaderboards/2026-11-13_user_A` and mutates `createdAt`, `dateKey`, or `uid`. -> `PERMISSION_DENIED`.
10. **Payload 10 (Slower Time Regression on Leaderboard Update)**: Owner updates `/dailyLeaderboards/2026-11-13_user_A` with a slower `clearTimeMs` (`50000 > existing 30000`). -> `PERMISSION_DENIED`.
11. **Payload 11 (Unrealistic / Exploited 0ms Clear Time)**: User submits `clearTimeMs: 50` (less than minimum 1000ms). -> `PERMISSION_DENIED`.
12. **Payload 12 (Shadow Field / Partial Update Gap on Leaderboard Update)**: Owner updates an unallowed key or injects `"hacked": 1` during update. -> `PERMISSION_DENIED` via `isValidDailyLeaderboardEntry(incoming())` + `affectedKeys().hasOnly(...)`.
