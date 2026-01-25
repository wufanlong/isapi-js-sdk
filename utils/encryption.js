import crypto from "crypto";
import forge from "node-forge";
import { aes_encrypt } from './AES.js'

export function getKeyPair() {
  return crypto.generateKeyPairSync("rsa", {
    modulusLength: 1024,
    publicKeyEncoding: { type: "pkcs1", format: "pem" },
    privateKeyEncoding: { type: "pkcs1", format: "pem" }
  });
}
export function getPublicKeyHex(publicKeyPem) {
  const pub = forge.pki.publicKeyFromPem(publicKeyPem);
  const publicKeyHex = pub.n.toString(16);
  return Buffer.from(publicKeyHex, 'utf8').toString('base64')
}
 
function encryptionKey(key, keyIterateNum) {
  let data = key + "AaBbCcDd1234!@#$";
  let hash;

  for (let i = 0; i < keyIterateNum; i++) {
    hash = crypto.createHash("sha256").update(data).digest();
    data = hash;
  }

  return hash.slice(0, 16);
}

export function aes128Encrypt(plaintext, iv) {
  const base64edPlaintext = Buffer.from(plaintext, "utf8").toString("base64")
  const cipher = crypto.createCipheriv('aes-128-cbc', encryptionKey(base64edPlaintext, 100), iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

export function getIV() {
    return crypto.randomBytes(16)
}

// 激活时加密密码
export function getEncryptedPassword(challengeKey, privateKeyPem, password) {
  const hexTextBuffer = Buffer.from(challengeKey, "base64");
  const hexText = hexTextBuffer.toString("utf8");
  const encryptedBuffer = Buffer.from(hexText, "hex");
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const decrypted = privateKey.decrypt(encryptedBuffer, 'RSAES-PKCS1-V1_5');
  const encryptedPassword = aes_encrypt(decrypted.substring(0, 16), decrypted, !0) + aes_encrypt(password, decrypted, !0);
  return Buffer.from(encryptedPassword, 'utf8').toString('base64')
}

// 手动填充到16字节倍数
function zeroPad(text) {
  const buf = Buffer.from(text, 'utf8')
  const padLen = 16 - (buf.length % 16);
  if (padLen === 16) return buf; // 不需要填充
  return Buffer.concat([buf, Buffer.alloc(padLen, 0)]);
}