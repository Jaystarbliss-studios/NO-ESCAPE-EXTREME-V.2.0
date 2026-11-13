import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

interface MockAuth {
  uid: string;
  email_verified: boolean;
}

const ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
const DATE_REGEX = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const SERVER_TIME = 'SERVER_TIMESTAMP';

function isValidId(id: unknown): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && ID_REGEX.test(id);
}

function isVerifiedUser(auth: MockAuth | null): boolean {
  return auth !== null && auth.email_verified === true;
}

function isOwner(auth: MockAuth | null, userId: string): boolean {
  return isVerifiedUser(auth) && auth!.uid === userId;
}

function isValidUserProgress(data: Record<string, unknown>, auth: MockAuth | null): boolean {
  const allowedKeys = [
    'uid',
    'displayName',
    'highestUnlockedLevel',
    'completedLevels',
    'coins',
    'unlockedCosmetics',
    'equippedSkin',
    'equippedTrail',
    'equippedPortalStyle',
    'dailyBestDate',
    'dailyBestTimeMs',
    'createdAt',
    'updatedAt',
  ];
  const keys = Object.keys(data);
  if (!allowedKeys.every((k) => keys.includes(k))) return false;
  if (!keys.every((k) => allowedKeys.includes(k))) return false;

  if (
    typeof data.uid !== 'string' ||
    data.uid.length < 1 ||
    data.uid.length > 128 ||
    !ID_REGEX.test(data.uid) ||
    data.uid !== auth?.uid
  ) {
    return false;
  }
  if (typeof data.displayName !== 'string' || data.displayName.length < 1 || data.displayName.length > 40) {
    return false;
  }
  if (
    typeof data.highestUnlockedLevel !== 'number' ||
    !Number.isInteger(data.highestUnlockedLevel) ||
    data.highestUnlockedLevel < 1 ||
    data.highestUnlockedLevel > 100
  ) {
    return false;
  }
  if (
    !Array.isArray(data.completedLevels) ||
    data.completedLevels.length > 100 ||
    (data.completedLevels.length > 0 && !Number.isInteger(data.completedLevels[0]))
  ) {
    return false;
  }
  if (typeof data.coins !== 'number' || !Number.isInteger(data.coins) || data.coins < 0 || data.coins > 10000000) {
    return false;
  }
  if (
    !Array.isArray(data.unlockedCosmetics) ||
    data.unlockedCosmetics.length < 1 ||
    data.unlockedCosmetics.length > 20 ||
    typeof data.unlockedCosmetics[0] !== 'string' ||
    data.unlockedCosmetics[0].length > 32
  ) {
    return false;
  }
  if (typeof data.equippedSkin !== 'string' || data.equippedSkin.length < 1 || data.equippedSkin.length > 32) {
    return false;
  }
  if (typeof data.equippedTrail !== 'string' || data.equippedTrail.length < 1 || data.equippedTrail.length > 32) {
    return false;
  }
  if (
    typeof data.equippedPortalStyle !== 'string' ||
    data.equippedPortalStyle.length < 1 ||
    data.equippedPortalStyle.length > 32
  ) {
    return false;
  }
  if (typeof data.dailyBestDate !== 'string' || data.dailyBestDate.length > 10) {
    return false;
  }
  if (
    typeof data.dailyBestTimeMs !== 'number' ||
    !Number.isInteger(data.dailyBestTimeMs) ||
    data.dailyBestTimeMs < 0 ||
    data.dailyBestTimeMs > 3600000
  ) {
    return false;
  }
  if (data.createdAt !== SERVER_TIME && data.createdAt !== 'EXISTING_TIMESTAMP') return false;
  if (data.updatedAt !== SERVER_TIME) return false;
  return true;
}

function isValidDailyLeaderboardEntry(data: Record<string, unknown>, auth: MockAuth | null): boolean {
  const allowedKeys = [
    'uid',
    'displayName',
    'dateKey',
    'seed',
    'clearTimeMs',
    'coinsCollected',
    'damageTaken',
    'skinId',
    'isPublic',
    'createdAt',
    'updatedAt',
  ];
  const keys = Object.keys(data);
  if (!allowedKeys.every((k) => keys.includes(k))) return false;
  if (!keys.every((k) => allowedKeys.includes(k))) return false;

  if (
    typeof data.uid !== 'string' ||
    data.uid.length < 1 ||
    data.uid.length > 128 ||
    !ID_REGEX.test(data.uid) ||
    data.uid !== auth?.uid
  ) {
    return false;
  }
  if (typeof data.displayName !== 'string' || data.displayName.length < 1 || data.displayName.length > 40) {
    return false;
  }
  if (typeof data.dateKey !== 'string' || data.dateKey.length !== 10 || !DATE_REGEX.test(data.dateKey)) {
    return false;
  }
  if (typeof data.seed !== 'number' || !Number.isInteger(data.seed)) return false;
  if (
    typeof data.clearTimeMs !== 'number' ||
    !Number.isInteger(data.clearTimeMs) ||
    data.clearTimeMs < 1000 ||
    data.clearTimeMs > 3600000
  ) {
    return false;
  }
  if (
    typeof data.coinsCollected !== 'number' ||
    !Number.isInteger(data.coinsCollected) ||
    data.coinsCollected < 0 ||
    data.coinsCollected > 500
  ) {
    return false;
  }
  if (
    typeof data.damageTaken !== 'number' ||
    !Number.isInteger(data.damageTaken) ||
    data.damageTaken < 0 ||
    data.damageTaken > 100
  ) {
    return false;
  }
  if (typeof data.skinId !== 'string' || data.skinId.length < 1 || data.skinId.length > 32) {
    return false;
  }
  if (data.isPublic !== true) return false;
  if (data.createdAt !== SERVER_TIME && data.createdAt !== 'EXISTING_TIMESTAMP') return false;
  if (data.updatedAt !== SERVER_TIME) return false;
  return true;
}

function evaluateUserCreate(userId: string, incoming: Record<string, unknown>, auth: MockAuth | null): string {
  const allowed =
    isOwner(auth, userId) &&
    isValidId(userId) &&
    isValidUserProgress(incoming, auth) &&
    incoming.createdAt === SERVER_TIME &&
    incoming.updatedAt === SERVER_TIME;
  return allowed ? 'ALLOW' : 'PERMISSION_DENIED';
}

function evaluateUserGet(userId: string, auth: MockAuth | null): string {
  return isOwner(auth, userId) && isValidId(userId) ? 'ALLOW' : 'PERMISSION_DENIED';
}

function evaluateLeaderboardCreate(
  entryId: string,
  incoming: Record<string, unknown>,
  auth: MockAuth | null
): string {
  const allowed =
    isVerifiedUser(auth) &&
    isValidId(entryId) &&
    isValidDailyLeaderboardEntry(incoming, auth) &&
    entryId === `${incoming.dateKey}_${auth?.uid}` &&
    incoming.createdAt === SERVER_TIME &&
    incoming.updatedAt === SERVER_TIME;
  return allowed ? 'ALLOW' : 'PERMISSION_DENIED';
}

function evaluateLeaderboardUpdate(
  entryId: string,
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
  auth: MockAuth | null
): string {
  const allowedUpdateKeys = ['displayName', 'clearTimeMs', 'coinsCollected', 'damageTaken', 'skinId', 'updatedAt'];
  const affectedKeys = Object.keys(incoming).filter((k) => incoming[k] !== existing[k]);
  const onlyAllowedAffected = affectedKeys.every((k) => allowedUpdateKeys.includes(k));

  const allowed =
    isVerifiedUser(auth) &&
    isValidId(entryId) &&
    isValidDailyLeaderboardEntry(incoming, auth) &&
    existing.uid === auth?.uid &&
    incoming.uid === existing.uid &&
    incoming.dateKey === existing.dateKey &&
    incoming.seed === existing.seed &&
    incoming.isPublic === existing.isPublic &&
    incoming.createdAt === existing.createdAt &&
    incoming.updatedAt === SERVER_TIME &&
    (incoming.clearTimeMs as number) <= (existing.clearTimeMs as number) &&
    onlyAllowedAffected;
  return allowed ? 'ALLOW' : 'PERMISSION_DENIED';
}

const baseValidUserPayload = {
  uid: 'user_A',
  displayName: 'RunnerAlpha',
  highestUnlockedLevel: 12,
  completedLevels: [1, 2, 3],
  coins: 150,
  unlockedCosmetics: ['skin_default', 'trail_ember'],
  equippedSkin: 'skin_default',
  equippedTrail: 'trail_ember',
  equippedPortalStyle: 'default',
  dailyBestDate: '2026-11-13',
  dailyBestTimeMs: 24500,
  createdAt: SERVER_TIME,
  updatedAt: SERVER_TIME,
};

const baseValidEntryPayload = {
  uid: 'user_A',
  displayName: 'RunnerAlpha',
  dateKey: '2026-11-13',
  seed: 48291032,
  clearTimeMs: 24500,
  coinsCollected: 12,
  damageTaken: 0,
  skinId: 'skin_default',
  isPublic: true,
  createdAt: SERVER_TIME,
  updatedAt: SERVER_TIME,
};

test('firestore.rules contains all mandatory security gates and matches blueprint collections', () => {
  const rulesText = fs.readFileSync('firestore.rules', 'utf8');
  assert.ok(rulesText.includes("match /{document=**} {\n      allow read, write: if false;"));
  assert.ok(rulesText.includes('match /users/{userId}'));
  assert.ok(rulesText.includes('match /dailyLeaderboards/{entryId}'));
  assert.ok(rulesText.includes('isValidUserProgress(incoming())'));
  assert.ok(rulesText.includes('isValidDailyLeaderboardEntry(incoming())'));
  assert.ok(rulesText.includes('request.auth.token.email_verified == true'));
});

test('Dirty Dozen adversarial payloads all return PERMISSION_DENIED', () => {
  const verifiedUserA: MockAuth = { uid: 'user_A', email_verified: true };
  const unverifiedUserA: MockAuth = { uid: 'user_A', email_verified: false };

  // Valid baseline checks pass
  assert.equal(evaluateUserCreate('user_A', baseValidUserPayload, verifiedUserA), 'ALLOW');
  assert.equal(
    evaluateLeaderboardCreate('2026-11-13_user_A', baseValidEntryPayload, verifiedUserA),
    'ALLOW'
  );

  // 1. Identity Spoofing on /users/{userId}
  assert.equal(
    evaluateUserCreate('user_B', { ...baseValidUserPayload, uid: 'user_B' }, verifiedUserA),
    'PERMISSION_DENIED'
  );

  // 2. Unverified Email Write
  assert.equal(evaluateUserCreate('user_A', baseValidUserPayload, unverifiedUserA), 'PERMISSION_DENIED');

  // 3. Shadow Field Injection on /users/{userId}
  assert.equal(
    evaluateUserCreate('user_A', { ...baseValidUserPayload, isAdmin: true }, verifiedUserA),
    'PERMISSION_DENIED'
  );

  // 4. Value Poisoning on highestUnlockedLevel
  assert.equal(
    evaluateUserCreate('user_A', { ...baseValidUserPayload, highestUnlockedLevel: 999 }, verifiedUserA),
    'PERMISSION_DENIED'
  );

  // 5. Unbounded Array Exhaustion
  assert.equal(
    evaluateUserCreate(
      'user_A',
      { ...baseValidUserPayload, completedLevels: Array.from({ length: 150 }, (_, i) => i + 1) },
      verifiedUserA
    ),
    'PERMISSION_DENIED'
  );

  // 6. Cross-User Read on /users/{userId}
  assert.equal(evaluateUserGet('user_B', verifiedUserA), 'PERMISSION_DENIED');

  // 7. ID Poisoning on /dailyLeaderboards/{entryId}
  assert.equal(
    evaluateLeaderboardCreate('2026-11-13_user_B', baseValidEntryPayload, verifiedUserA),
    'PERMISSION_DENIED'
  );

  // 8. Timestamp Forgery
  assert.equal(
    evaluateLeaderboardCreate(
      '2026-11-13_user_A',
      { ...baseValidEntryPayload, createdAt: 'FORGED_CLIENT_TIME' },
      verifiedUserA
    ),
    'PERMISSION_DENIED'
  );

  // 9. Immortal Field Mutation on Update
  const existingEntry = { ...baseValidEntryPayload, createdAt: 'EXISTING_TIMESTAMP' };
  assert.equal(
    evaluateLeaderboardUpdate(
      '2026-11-13_user_A',
      existingEntry,
      { ...existingEntry, dateKey: '2026-11-14', clearTimeMs: 20000, updatedAt: SERVER_TIME },
      verifiedUserA
    ),
    'PERMISSION_DENIED'
  );

  // 10. Slower Time Regression on Leaderboard Update
  assert.equal(
    evaluateLeaderboardUpdate(
      '2026-11-13_user_A',
      existingEntry,
      { ...existingEntry, clearTimeMs: 39000, updatedAt: SERVER_TIME },
      verifiedUserA
    ),
    'PERMISSION_DENIED'
  );

  // 11. Unrealistic / Exploited 0ms Clear Time
  assert.equal(
    evaluateLeaderboardCreate(
      '2026-11-13_user_A',
      { ...baseValidEntryPayload, clearTimeMs: 50 },
      verifiedUserA
    ),
    'PERMISSION_DENIED'
  );

  // 12. Shadow Field on Leaderboard Update
  assert.equal(
    evaluateLeaderboardUpdate(
      '2026-11-13_user_A',
      existingEntry,
      { ...existingEntry, clearTimeMs: 21000, hacked: true, updatedAt: SERVER_TIME },
      verifiedUserA
    ),
    'PERMISSION_DENIED'
  );
});
