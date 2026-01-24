import crypto from "crypto";
import forge from "node-forge";


const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 1024,
  publicKeyEncoding: { type: "pkcs1", format: "pem" },
  privateKeyEncoding: { type: "pkcs1", format: "pem" }
});
const pub = forge.pki.publicKeyFromPem(publicKey);
let publicKeyHex = pub.n.toString(16).toUpperCase();
export const encodedPublicKey = Buffer.from(publicKeyHex, "utf8").toString("base64");

// 3️⃣ 补齐 256 个字符
publicKeyHex = publicKeyHex.padStart(256, "0");
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
  const cipher = crypto.createCipheriv('aes-128-cbc', encryptionKey(plaintext, 100), iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

export function getIV() {
    return crypto.randomBytes(16)
}