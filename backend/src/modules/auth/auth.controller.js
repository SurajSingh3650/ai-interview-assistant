const { z } = require("zod");
const asyncHandler = require("../../utils/asyncHandler");
const authService = require("./auth.service");

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const register = asyncHandler(async (req, res) => {
  const payload = credentialsSchema.parse(req.body);
  const user = await authService.register(payload);
  res.status(201).json({ data: user });
});

const login = asyncHandler(async (req, res) => {
  const payload = credentialsSchema.parse(req.body);
  const result = await authService.login({
    ...payload,
    deviceInfo: {
      userAgent: req.headers["user-agent"] || "unknown",
      ip: req.ip,
      deviceId: req.headers["x-device-id"] || "unknown"
    }
  });
  res.status(200).json({ data: result });
});

const createRealtimeToken = asyncHandler(async (req, res) => {
  const token = authService.createRealtimeToken(req.user);
  res.status(200).json({ data: { token } });
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user);
  res.status(200).json({ data: { success: true } });
});

const getHistory = asyncHandler(async (req, res) => {
  const history = await authService.getHistory(req.user.sub);
  res.status(200).json({ data: history });
});

module.exports = {
  register,
  login,
  createRealtimeToken,
  logout,
  getHistory
};
