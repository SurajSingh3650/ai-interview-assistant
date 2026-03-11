const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const env = require("../../config/env");
const AppError = require("../../utils/AppError");
const { getCollections } = require("../../db/mongodb");

async function register({ email, password }) {
  const { users } = getCollections();
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 10);
  const name = normalizedEmail.split("@")[0];

  const existing = await users.findOne({ email: normalizedEmail }, { projection: { id: 1 } });
  if (existing) {
    throw new AppError(409, "EMAIL_EXISTS", "Email is already registered");
  }

  const id = uuidv4();
  try {
    await users.insertOne({
      id,
      name,
      email: normalizedEmail,
      passwordHash,
      role: "candidate",
      sessionVersion: 0,
      createdAt: new Date()
    });
  } catch (error) {
    if (error && error.code === 11000) {
      throw new AppError(409, "EMAIL_EXISTS", "Email is already registered");
    }
    throw error;
  }

  return { id, name, email: normalizedEmail, role: "candidate" };
}

async function login({ email, password, deviceInfo }) {
  const { users, userSessions } = getCollections();
  const normalizedEmail = email.trim().toLowerCase();

  const user = await users.findOne({
    email: normalizedEmail
  });

  if (!user) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);

  if (!isValidPassword) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const now = new Date();
  const tokenId = uuidv4();

  await users.updateOne(
    { id: user.id },
    {
      $inc: { sessionVersion: 1 },
      $set: { lastLoginAt: now }
    }
  );

  const refreshedUser = await users.findOne(
    { id: user.id },
    { projection: { _id: 0, id: 1, name: 1, email: 1, role: 1, sessionVersion: 1 } }
  );

  const sessionVersion = Number(refreshedUser?.sessionVersion || 0);

  await userSessions.updateMany(
    { userId: user.id, isActive: true },
    {
      $set: {
        isActive: false,
        expiredAt: now,
        revokedReason: "new_login"
      }
    }
  );

  await userSessions.insertOne({
    id: uuidv4(),
    userId: user.id,
    tokenId,
    isActive: true,
    createdAt: now,
    expiredAt: null,
    lastSeenAt: now,
    deviceInfo: {
      userAgent: deviceInfo?.userAgent || "unknown",
      ip: deviceInfo?.ip || "unknown",
      deviceId: deviceInfo?.deviceId || "unknown"
    }
  });

  const accessToken = jwt.sign(
    {
      sub: user.id,
      email: refreshedUser?.email || user.email,
      role: refreshedUser?.role || user.role || "candidate",
      sv: sessionVersion,
      jti: tokenId,
      type: "access"
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  return {
    accessToken,
    user: {
      id: user.id,
      name: refreshedUser?.name || user.name || null,
      email: refreshedUser?.email || user.email,
      role: refreshedUser?.role || user.role || "candidate"
    }
  };
}

function createRealtimeToken(user) {
  return jwt.sign(
    {
      sub: user.sub,
      email: user.email,
      role: user.role,
      sv: user.sv,
      jti: uuidv4(),
      atid: user.jti,
      type: "realtime"
    },
    env.JWT_SECRET,
    { expiresIn: env.REALTIME_TOKEN_EXPIRES_IN }
  );
}

async function logout(userClaims) {
  const { users, userSessions } = getCollections();
  const now = new Date();

  await userSessions.updateOne(
    { userId: userClaims.sub, tokenId: userClaims.jti, isActive: true },
    {
      $set: {
        isActive: false,
        expiredAt: now,
        revokedReason: "logout"
      }
    }
  );

  await users.updateOne(
    { id: userClaims.sub },
    {
      $inc: { sessionVersion: 1 },
      $set: { lastLogoutAt: now }
    }
  );
}

async function getHistory(userId) {
  const { interviewHistories } = getCollections();
  return interviewHistories
    .find(
      { userId },
      {
        projection: {
          _id: 0,
          id: 1,
          sessionId: 1,
          transcript: { $slice: -30 },
          aiResponses: { $slice: -30 },
          metadata: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    )
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();
}

module.exports = {
  register,
  login,
  createRealtimeToken,
  logout,
  getHistory
};
