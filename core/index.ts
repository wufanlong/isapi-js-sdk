import client from './client.ts'
import security from './security.ts'
import system from './system.ts'

export function createCoreModule(that):object {
    return {
        client: client(that),
        security: security(that),
        system: system(that),
    }
}