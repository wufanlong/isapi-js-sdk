import crypto from "crypto";

function md5(str: string) {
  return crypto.createHash("md5").update(str).digest("hex");
}

export function getAuthorization(response, authHeader, that) {
  if (/^Basic\s/i.test(authHeader)) {
    const token = Buffer.from(`${that.username}:${that.password}`).toString(
      "base64",
    );
    return `Basic ${token}`;
  } else if (/^Digest\s/i.test(authHeader)) {
    const params = Object.fromEntries(
      authHeader
        .replace(/^Digest\s+/i, "")
        .split(",")
        .map((v) =>
          v
            .trim()
            .split("=")
            .map((s) => s.replace(/"/g, "")),
        ),
    );
    return buildDigestAuth(
      {
        username: that.username,
        password: that.password,
        method: response.config.method.toUpperCase(),
        uri: new URL(response.config.url).pathname,
        realm: params.realm,
        nonce: params.nonce,
        qop: params.qop,
        opaque: params.opaque,
      },
      response.data,
    );
  } else {
    throw new Error(`Unsupported auth type: ${authHeader}`);
  }
}

export function buildDigestAuth(
  {
    username,
    password,
    method,
    uri,
    realm,
    nonce,
    qop,
    opaque,
    nc = "00000001",
  },
  data,
) {
  const cnonce = crypto.randomBytes(8).toString("hex");

  const HA1 = md5(`${username}:${realm}:${password}`);
  let HA2;
  if (uri.includes("\n") || uri.includes("\r") || uri.includes(" ")) {
    throw new Error(`Invalid uri for digest: "${uri}"`);
  }
  if (!qop || qop === "auth") {
    HA2 = md5(`${method}:${uri}`);
  } else if (qop === "auth-int") {
    HA2 = md5(`${method}:${uri}:${md5(data)}`);
  } else {
    throw new Error(`Unsupported qop value: ${qop}`);
  }

  let response;
  if (!qop) {
    response = md5(`${HA1}:${nonce}:${HA2}`);
  } else if (qop === "auth" || qop === "auth-int") {
    response = md5(`${HA1}:${nonce}:${nc}:${cnonce}:${qop}:${HA2}`);
  } else {
    throw new Error(`Unsupported qop value: ${qop}`);
  }

  let result =
    `Digest ` +
    `username="${username}", ` +
    `realm="${realm}", ` +
    `nonce="${nonce}", ` +
    `uri="${uri}", ` +
    `qop="${qop}", ` +
    `nc="${nc}", ` +
    `cnonce="${cnonce}", ` +
    `response="${response}"`;

  if (opaque && opaque !== "") {
    result += `, opaque="${opaque}"`;
  }

  return result;
}
