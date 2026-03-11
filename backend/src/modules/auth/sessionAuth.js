const AppError = require("../../utils/AppError");
const { getCollections } = require("../../db/mongodb");

async function getUserForAuth(userId) {
  const { users } = getCollections();
  return users.findOne(
    { id: userId },
    {
      projection: {
        _id: 0,
        id: 1,
        email: 1,
        role: 1,
        name: 1,
        sessionVersion: 1
      }
    }
  );
}

async function validateAccessClaims(claims) {
  if (claims.type !== "access") {
    throw new AppError(401, "INVALID_TOKEN", "Invalid token type");
  }

  const user = await getUserForAuth(claims.sub);
  if (!user) {
    throw new AppError(401, "INVALID_TOKEN", "User no longer exists");
  }

  const sessionVersion = Number(user.sessionVersion || 0);
  if (Number(claims.sv) !== sessionVersion) {
    throw new AppError(401, "SESSION_REVOKED", "Session has expired. Please login again");
  }

  const { userSessions } = getCollections();
  const session = await userSessions.findOne(
    {
      userId: user.id,
      tokenId: claims.jti,
      isActive: true
    },
    { projection: { _id: 0, id: 1, tokenId: 1, isActive: 1, expiredAt: 1 } }
  );

  if (!session) {
    throw new AppError(401, "SESSION_REVOKED", "Session has expired. Please login again");
  }

  if (session.expiredAt && new Date(session.expiredAt).getTime() <= Date.now()) {
    throw new AppError(401, "SESSION_REVOKED", "Session has expired. Please login again");
  }

  return { user, session };
}

async function validateRealtimeClaims(claims) {
  if (claims.type !== "realtime") {
    throw new AppError(401, "INVALID_TOKEN", "Invalid token type");
  }

  const user = await getUserForAuth(claims.sub);
  if (!user) {
    throw new AppError(401, "INVALID_TOKEN", "User no longer exists");
  }

  const sessionVersion = Number(user.sessionVersion || 0);
  if (Number(claims.sv) !== sessionVersion) {
    throw new AppError(401, "SESSION_REVOKED", "Realtime session has expired");
  }

  const { userSessions } = getCollections();
  const accessSession = await userSessions.findOne(
    {
      userId: user.id,
      tokenId: claims.atid,
      isActive: true
    },
    { projection: { _id: 0, id: 1, tokenId: 1, isActive: 1, expiredAt: 1 } }
  );

  if (!accessSession) {
    throw new AppError(401, "SESSION_REVOKED", "Realtime session has expired");
  }

  if (accessSession.expiredAt && new Date(accessSession.expiredAt).getTime() <= Date.now()) {
    throw new AppError(401, "SESSION_REVOKED", "Realtime session has expired");
  }

  return { user, accessSession };
}

module.exports = {
  validateAccessClaims,
  validateRealtimeClaims
};
