const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
// Ensure ENCRYPTION_KEY is 32 bytes. If not set, use a fallback for dev, but warn.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);

// If ENCRYPTION_KEY is longer than 32, slice it. If shorter, pad it.
const getKey = () => {
  let key = ENCRYPTION_KEY;
  if (key.length < 32) {
    key = key.padEnd(32, "0");
  } else if (key.length > 32) {
    key = key.slice(0, 32);
  }
  return Buffer.from(key, "utf-8");
};

const encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  
  return {
    iv: iv.toString("hex"),
    encryptedData: encrypted,
    authTag: authTag,
  };
};

const decrypt = (hash) => {
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(hash.iv, "hex"));
  decipher.setAuthTag(Buffer.from(hash.authTag, "hex"));
  
  let decrypted = decipher.update(hash.encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
};

const encryptJSON = (obj) => {
  return JSON.stringify(encrypt(JSON.stringify(obj)));
};

const decryptJSON = (encryptedStr) => {
  const hash = JSON.parse(encryptedStr);
  return JSON.parse(decrypt(hash));
};

module.exports = {
  encryptJSON,
  decryptJSON,
};
