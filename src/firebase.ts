import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  User,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { DailyLeaderboardRecord, SavedProgress } from './game/types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

const ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
const DATE_REGEX = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

function sanitizeCallsign(rawName: string | null | undefined): string {
  const cleaned = (rawName || 'Survivor').trim().replace(/\s+/g, ' ');
  if (cleaned.length < 1) return 'Survivor';
  return cleaned.slice(0, 40);
}

export async function signInWithGoogle(): Promise<User | null> {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function subscribeAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function loadCloudUserProgress(user: User): Promise<Partial<SavedProgress> | null> {
  if (!user?.uid || !ID_REGEX.test(user.uid)) return null;
  const path = `users/${user.uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      highestUnlockedLevel:
        typeof data.highestUnlockedLevel === 'number' ? data.highestUnlockedLevel : 1,
      completedLevels: Array.isArray(data.completedLevels) ? data.completedLevels : [],
      coins: typeof data.coins === 'number' ? data.coins : 0,
      unlockedCosmetics: Array.isArray(data.unlockedCosmetics)
        ? data.unlockedCosmetics
        : ['skin_default', 'trail_ember'],
      equippedSkin: typeof data.equippedSkin === 'string' ? data.equippedSkin : 'skin_default',
      equippedTrail: typeof data.equippedTrail === 'string' ? data.equippedTrail : 'trail_ember',
      equippedPortalStyle:
        typeof data.equippedPortalStyle === 'string' ? data.equippedPortalStyle : 'default',
      dailyBestDate: typeof data.dailyBestDate === 'string' ? data.dailyBestDate : '',
      dailyBestTimeMs: typeof data.dailyBestTimeMs === 'number' ? data.dailyBestTimeMs : 0,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function syncUserProgressToCloud(
  user: User,
  progress: SavedProgress
): Promise<void> {
  if (!user?.uid || !user.emailVerified || !ID_REGEX.test(user.uid) || user.uid.length > 128) {
    return;
  }

  const path = `users/${user.uid}`;
  const docRef = doc(db, 'users', user.uid);

  const sanitizedCompletedLevels = Array.from(
    new Set(
      (progress.completedLevels || [])
        .map((n) => Math.floor(Number(n)))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 100)
    )
  ).slice(0, 100);

  const sanitizedCosmetics = Array.from(
    new Set(
      ['skin_default', 'trail_ember', ...(progress.unlockedCosmetics || [])]
        .filter((id) => typeof id === 'string' && id.length >= 1 && id.length <= 32)
    )
  ).slice(0, 20);

  const baseFields = {
    displayName: sanitizeCallsign(user.displayName),
    highestUnlockedLevel: Math.max(
      1,
      Math.min(100, Math.floor(progress.highestUnlockedLevel || 1))
    ),
    completedLevels: sanitizedCompletedLevels,
    coins: Math.max(0, Math.min(10000000, Math.floor(progress.coins || 0))),
    unlockedCosmetics: sanitizedCosmetics,
    equippedSkin: (progress.equippedSkin || 'skin_default').slice(0, 32),
    equippedTrail: (progress.equippedTrail || 'trail_ember').slice(0, 32),
    equippedPortalStyle: (progress.equippedPortalStyle || 'default').slice(0, 32),
    dailyBestDate: (progress.dailyBestDate || '').slice(0, 10),
    dailyBestTimeMs: Math.max(
      0,
      Math.min(3600000, Math.round(progress.dailyBestTimeMs || 0))
    ),
    updatedAt: serverTimestamp(),
  };

  try {
    const existingSnap = await getDoc(docRef);
    if (!existingSnap.exists()) {
      await setDoc(docRef, {
        uid: user.uid,
        ...baseFields,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(docRef, baseFields);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function submitDailyLeaderboardScore(
  user: User,
  params: {
    dateKey: string;
    seed: number;
    clearTimeMs: number;
    coinsCollected: number;
    damageTaken: number;
    skinId: string;
  }
): Promise<void> {
  if (!user?.uid || !user.emailVerified || !ID_REGEX.test(user.uid)) return;
  if (!DATE_REGEX.test(params.dateKey)) return;

  const entryId = `${params.dateKey}_${user.uid}`;
  if (entryId.length > 128 || !ID_REGEX.test(entryId)) return;

  const path = `dailyLeaderboards/${entryId}`;
  const docRef = doc(db, 'dailyLeaderboards', entryId);

  const clampedTimeMs = Math.max(1000, Math.min(3600000, Math.round(params.clearTimeMs)));
  const clampedCoins = Math.max(0, Math.min(500, Math.floor(params.coinsCollected)));
  const clampedDamage = Math.max(0, Math.min(100, Math.floor(params.damageTaken)));
  const skinId = (params.skinId || 'skin_default').slice(0, 32);
  const displayName = sanitizeCallsign(user.displayName);

  try {
    const existingSnap = await getDoc(docRef);
    if (!existingSnap.exists()) {
      await setDoc(docRef, {
        uid: user.uid,
        displayName,
        dateKey: params.dateKey,
        seed: Math.floor(params.seed),
        clearTimeMs: clampedTimeMs,
        coinsCollected: clampedCoins,
        damageTaken: clampedDamage,
        skinId,
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existingData = existingSnap.data();
      const prevBest =
        typeof existingData.clearTimeMs === 'number' ? existingData.clearTimeMs : 3600000;
      if (clampedTimeMs <= prevBest) {
        await updateDoc(docRef, {
          displayName,
          clearTimeMs: clampedTimeMs,
          coinsCollected: clampedCoins,
          damageTaken: clampedDamage,
          skinId,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToDailyLeaderboard(
  dateKey: string,
  onEntries: (entries: DailyLeaderboardRecord[]) => void
): () => void {
  if (!DATE_REGEX.test(dateKey)) {
    onEntries([]);
    return () => {};
  }
  const path = 'dailyLeaderboards';
  const q = query(
    collection(db, path),
    where('isPublic', '==', true),
    where('dateKey', '==', dateKey),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const records: DailyLeaderboardRecord[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (typeof d.clearTimeMs === 'number' && typeof d.displayName === 'string') {
          records.push({
            id: docSnap.id,
            uid: String(d.uid || docSnap.id),
            displayName: d.displayName,
            dateKey: String(d.dateKey || dateKey),
            seed: Number(d.seed || 0),
            clearTimeMs: Math.round(d.clearTimeMs),
            coinsCollected: Number(d.coinsCollected || 0),
            damageTaken: Number(d.damageTaken || 0),
            skinId: String(d.skinId || 'skin_default'),
            isLiveCloud: true,
          });
        }
      });
      records.sort((a, b) => a.clearTimeMs - b.clearTimeMs);
      onEntries(records);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
