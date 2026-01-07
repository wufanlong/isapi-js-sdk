import crypto from "crypto";

function encryptionKey(password, keyIterateNum) {
  let data = password + "AaBbCcDd1234!@#$";
  let hash;

  for (let i = 0; i < keyIterateNum; i++) {
    hash = crypto.createHash("sha256").update(data).digest();
    data = hash;
  }

  return hash.slice(0, 16);
}

export function aes128Encrypt(plaintext, iv) {
  const cipher = crypto.createCipheriv('aes-128-cbc', encryptionKey(plaintext, 100), iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

export function getIV() {
    return crypto.randomBytes(16)
}