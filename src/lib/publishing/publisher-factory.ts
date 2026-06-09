import { decrypt } from '@/lib/encryption/tokens'
import { WordPressAdapter } from './wordpress'
import { LinkedInAdapter } from './linkedin'
import { XAdapter } from './x'
import { InstagramAdapter } from './instagram'
import type { PublisherInterface } from './interface'
import type { Tables } from '@/types/database.types'

type PlatformConnection = Tables<'platform_connections'>

export function createPublisher(connection: PlatformConnection): PublisherInterface {
  const raw = connection.credentials_encrypted
  const creds = JSON.parse(
    decrypt(typeof raw === 'string' ? raw : JSON.stringify(raw))
  ) as Record<string, string>

  switch (connection.platform) {
    case 'wordpress':
      return new WordPressAdapter({
        siteUrl: creds.siteUrl,
        username: creds.username,
        applicationPassword: creds.applicationPassword,
      })

    case 'linkedin':
      return new LinkedInAdapter({
        accessToken: creds.accessToken,
        personId: creds.personId,
      })

    case 'x':
      return new XAdapter({
        accessToken: creds.accessToken,
        accessTokenSecret: creds.accessTokenSecret || '',
      })

    case 'instagram':
      return new InstagramAdapter({
        accessToken: creds.accessToken,
        igAccountId: creds.igAccountId,
        pageId: creds.pageId,
      })

    default:
      throw new Error(`No publisher for platform: ${connection.platform}`)
  }
}
