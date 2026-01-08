import { buildDigestAuth } from '../utils/authentication.js';
export default function client(context) {
    return {
    }
}

export async function callback(f, context) {
    try {
        const response = await f(context);
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
            const authorization = buildDigestAuth({
                username: context.username,
                password: context.password,
                method: response.config.method.toUpperCase(),
                uri: new URL(response.config.url).pathname,
                realm: params.realm,
                nonce: params.nonce,
                qop: params.qop,
                opaque: params.opaque
            }, response.data);
            context.axiosOptions = {
                headers: {
                    Authorization: authorization
                }
            }
            return f(context);
        } else {
            throw new Error(error.message);
        }
    }
}