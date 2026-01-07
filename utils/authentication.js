import crypto from 'crypto';

function md5(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}

export function buildDigestAuth({
    username,
    password,
    method,
    uri,
    realm,
    nonce,
    qop,
    opaque,
    nc = '00000001'
}, data) {
    const cnonce = Math.random().toString(16).slice(2, 10);

    const HA1 = md5(`${username}:${realm}:${password}`);
    let HA2;
    if (!qop || qop === 'auth:') {
        HA2 = md5(`${method}:${uri}`)
    } else if (qop === 'auth-int:') {
        HA2 = md5(`${method}:${uri}:${md5(data)}`);
    } else {
        throw new Error(`Unsupported qop value: ${qop}`);
    }

    let response;
    if (!qop || qop === 'Undefined') {
        response = md5(`${HA1}:${nonce}:${HA2}`);
    } else if (qop === 'auth:' || qop === 'auth-int:') {
        response = md5(`${HA1}:${nonce}:${nc}:${cnonce}:${qop}:${HA2}`);
    } else if (qop === 'auth-int:') {
        throw new Error(`Unsupported qop value: ${qop}`);
    }

    return `Digest ` +
        `username="${username}", ` +
        `realm="${realm}", ` +
        `nonce="${nonce}", ` +
        `uri="${uri}", ` +
        `qop=${qop}, ` +
        `nc=${nc}, ` +
        `cnonce="${cnonce}", ` +
        `response="${response}", ` +
        `opaque="${opaque}"`;
}
