import crypto from "node:crypto";

export const sha256 = (v) => crypto.createHash("sha256").update(String(v)).digest("hex");
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");
export const randomCode = () => String(crypto.randomInt(100000, 1000000));
export const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
