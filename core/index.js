import client from './client.js'
import security from './security.js'

export function createCoreModule(context) {
    return {
        client: client(context),
        security: security(context),
    }
}