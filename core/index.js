import client from './client.js'
import security from './security.js'
import system from './system.js'

export function createCoreModule(that) {
    return {
        client: client(that),
        security: security(that),
        system: system(that),
    }
}