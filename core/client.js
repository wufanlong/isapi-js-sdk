import { buildDigestAuth } from '../utils/authentication.js';
export default function client(that) {
    return {
    }
}

export async function callback(f, that) {
    try {
        const response = await f(that.context);
        return response;
    } catch (error) {
        const response = error.response;
        if (response && response.status === 401) {
            const authHeader = response.headers.get('www-authenticate');
            const params = Object.fromEntries(
                authHeader
                    .replace(/^Digest\s+/i, '')
                    .split(',')
                    .map(v => v.trim().split('=').map(s => s.replace(/"/g, '')))
            );
            const Authorization = buildDigestAuth({
                username: that.context.username,
                password: that.context.password,
                method: response.config.method.toUpperCase(),
                uri: new URL(response.config.url).pathname,
                realm: params.realm,
                nonce: params.nonce,
                qop: params.qop,
                opaque: params.opaque
            }, response.data);
            that.context.axiosOptions.headers.Authorization = Authorization;
            return f(that.context);
        } else {
            throw new Error(error.message);
        }
    }
}