// Server-side user store for Iris authentication.
//
// Users are stored as JSON on the same Docker volume as projects (IRIS_DATA_DIR,
// default /data), under <dataDir>/users/<id>.json. Passwords are never stored in
// plaintext — we use Node's built-in scrypt with a per-user random salt, so there
// are no external hashing dependencies.

import { promises as fs } from "fs";
import path from "path";
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "crypto";
import { DATA_DIR } from "./data-dir";

const USERS_DIR = path.join(DATA_DIR, "users");

export type StoredUser = {
  id: string;
  email: string;
  name: string;
  /** scrypt hash + salt, stored as "salt:hash" hex. */
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

/** Public shape of a user (never leaks the password hash). */
export type PublicUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export function toPublicUser(user: StoredUser): PublicUser {
  return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };
}

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, derived) => (err ? reject(err) : resolve(derived)));
  });
}

/** Hash a password with a fresh random salt. Returns "salt:hash" (hex). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

/** Constant-time verify a password against a stored "salt:hash" value. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derived = await scryptAsync(password, salt);
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Deterministic, filesystem-safe id derived from the email. */
function idForEmail(email: string): string {
  return normalizeEmail(email).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || randomUUID();
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function userFile(id: string): string {
  return path.join(USERS_DIR, `${id}.json`);
}

export async function getUserById(id: string): Promise<StoredUser | undefined> {
  const file = userFile(id);
  if (!(await pathExists(file))) return undefined;
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as StoredUser;
  } catch {
    return undefined;
  }
}

export async function getUserByEmail(email: string): Promise<StoredUser | undefined> {
  return getUserById(idForEmail(email));
}

export async function countUsers(): Promise<number> {
  if (!(await pathExists(USERS_DIR))) return 0;
  const entries = await fs.readdir(USERS_DIR);
  return entries.filter((f) => f.endsWith(".json")).length;
}

export type CreateUserInput = { email: string; name: string; password: string };

/** Create a new user. Throws if the email is already registered. */
export async function createUser(input: CreateUserInput): Promise<StoredUser> {
  const email = normalizeEmail(input.email);
  const id = idForEmail(email);
  await ensureDir(USERS_DIR);
  if (await pathExists(userFile(id))) {
    throw new Error("An account with this email already exists.");
  }
  const now = new Date().toISOString();
  const user: StoredUser = {
    id,
    email,
    name: input.name.trim() || email.split("@")[0],
    passwordHash: await hashPassword(input.password),
    createdAt: now,
    updatedAt: now,
  };
  await fs.writeFile(userFile(id), JSON.stringify(user, null, 2), "utf8");
  return user;
}

/** Update a user's password (used by change-password). */
export async function updatePassword(id: string, newPassword: string): Promise<boolean> {
  const user = await getUserById(id);
  if (!user) return false;
  const next: StoredUser = {
    ...user,
    passwordHash: await hashPassword(newPassword),
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(userFile(id), JSON.stringify(next, null, 2), "utf8");
  return true;
}
