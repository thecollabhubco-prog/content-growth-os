import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
// Strip BOM / whitespace and keep only hex chars so a stray byte in the env var
// can't silently produce a short (invalid-length) key.
const RAW_KEY = (process.env.ENCRYPTION_KEY || '0'.repeat(64)).replace(/[^0-9a-fA-F]/g, '')
const KEY = Buffer.from(RAW_KEY, 'hex')
if (KEY.length !== 32) {
  throw new Error(`ENCRYPTION_KEY must be 64 hex chars (32 bytes); got ${KEY.length} bytes`)
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, KEY, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return JSON.stringify({
    iv: iv.toString('hex'),
    encrypted: encrypted.toString('hex'),
    authTag: authTag.toString('hex'),
  })
}

export function decrypt(ciphertext: string): string {
  const { iv, encrypted, authTag } = JSON.parse(ciphertext)

  const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(iv, 'hex'))
  decipher.setAuthTag(Buffer.from(authTag, 'hex'))

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'hex')),
    decipher.final(),
  ]).toString('utf8')
}
