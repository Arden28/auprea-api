const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const prisma = require('./prisma');

const REFRESH_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const signAccess = (userId) =>
  jwt.sign({ sub: userId }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

const signRefresh = () => uuidv4();

const saveRefreshToken = async (userId, token) => {
  await prisma.refreshToken.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + REFRESH_MS),
    },
  });
};

const rotateRefreshToken = async (oldToken, userId) => {
  await prisma.refreshToken.delete({ where: { token: oldToken } });
  const newToken = signRefresh();
  await saveRefreshToken(userId, newToken);
  return newToken;
};

const revokeAllForUser = async (userId) => {
  await prisma.refreshToken.deleteMany({ where: { userId } });
};

const verifyRefreshToken = async (token) => {
  const record = await prisma.refreshToken.findUnique({ where: { token } });
  if (!record) return null;
  if (record.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { token } });
    return null;
  }
  return record;
};

module.exports = {
  signAccess,
  signRefresh,
  saveRefreshToken,
  rotateRefreshToken,
  revokeAllForUser,
  verifyRefreshToken,
};
