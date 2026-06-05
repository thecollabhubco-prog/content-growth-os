import { decrypt } from '@/lib/encryption/tokens'
import { WordPressAdapter } from './wordpress'
import { LinkedInAdapter } from './linkedin'
import { XAdapter } from './x'
import type { PublisherInterface } from './interface'
import type { Tables } from '@/types/database.types'

type PlatformConnection = Tables<'platform_connections'>

export function createPublisher(connection: PlatformConnection): PublisherInterface {
  const creds = JSON.parse(
    decrypt(JSON.stringify(connection.credentials_encrypted))
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
        accessTokenSecret: creds.accessTokenSecret,
      })

    default:
      throw new Error(`No publisher for platform: ${connection.platform}`)
  }
}
