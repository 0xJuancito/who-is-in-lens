import { TwitterApi, UserV2 } from "twitter-api-v2"
import dotenv from "dotenv"
import { BigNumber, ethers } from "ethers"

const LENS_CONTRACT_ADDRESS = "0xdb46d1dc155634fbc732f92e853b10b288ad5a1d"

type ProvidersConfig = {
  ethProviderUrl: string
  polygonProviderUrl: string
}

type Handle = {
  twitter: {
    handle: string
    name: string
    description: string | null
    avatar: string | null
  }
  lens: {
    handle: string
  }
  ensName: string | null
}

dotenv.config()

export class TooManyRequestsError extends Error {}
export class NoTwitterProfileError extends Error {}
export class NoFollowingError extends Error {}

export async function findFriends(username: string, twitterToken?: string): Promise<Handle[]> {
  const initTime = Date.now()

  const providersConfig = getProvidersConfig()

  // Initialize providers
  const ethProvider = new ethers.providers.JsonRpcProvider(providersConfig.ethProviderUrl)
  const polygonProvider = new ethers.providers.JsonRpcProvider(providersConfig.polygonProviderUrl)

  // Get Twitter following
  const following = await getTwitterFollowing(username, twitterToken)
  if (!following) {
    throw new NoTwitterProfileError(`There is no Twitter profile for that handle`)
  }

  const profiles: Handle[] = []

  // May become subject to some limit if too many users
  const lensPromise = async (follower: UserV2) => {
    try {
      let lensNameFromTwitter = parseLensName(follower.name) || parseLensName(follower.description)
      const ensName = parseEnsName(follower.name) || parseEnsName(follower.description)

      // Check the address with the ENS for a Lens profile
      let lensNameFromEns
      if (!lensNameFromTwitter && ensName) {
        lensNameFromEns = await getLensHandleFromEns(ensName, ethProvider, polygonProvider)
      }

      // Push lens profile to the list
      const lensName = lensNameFromTwitter || lensNameFromEns
      if (lensName) {
        profiles.push({
          twitter: {
            handle: follower.username,
            name: follower.name,
            description: follower.description || null,
            avatar: follower.profile_image_url || null,
          },
          lens: { handle: lensName },
          ensName,
        })
        console.log(`Found @${follower.username} => ${lensName}`)
      }
    } catch (err) {
      console.log(err)
    }
  }

  // Force promises to be resolved in a specific timeout
  // Try to resolve the promise in less than 10 seconds approximmately
  const timeTaken = Date.now() - initTime
  const TIMEOUT = 9000 - timeTaken
  const timeoutPromise = new Promise<void>((resolve) => setTimeout(() => resolve(), TIMEOUT))

  if (!following.data) {
    throw new NoFollowingError("There are no Lens users for that profile")
  }

  const promises = following.data.map((follower) => Promise.race([lensPromise(follower), timeoutPromise]))
  await Promise.all(promises)

  return profiles
}

async function getLensHandleFromEns(ensName: string, ethProvider: any, polygonProvider: any): Promise<string | null> {
  // Resolve ENS name to address
  const userAddress = await ethProvider.resolveName(ensName)
  if (!userAddress) {
    return null
  }

  const lensContract = new ethers.Contract(
    LENS_CONTRACT_ADDRESS,
    [
      "function defaultProfile(address wallet) external view override returns (uint256)",
      "function getHandle(uint256 profileId) external view override returns (string memory)",
    ],
    polygonProvider
  )

  // Get the default Lens profile id from an address
  const defaultProfile = (await lensContract.defaultProfile(userAddress)) as BigNumber
  if (!defaultProfile) {
    return null
  }

  // Get the .lens handle for a Lens profile id
  const handle = await lensContract.getHandle(defaultProfile)
  return handle || null
}

function getProvidersConfig(): ProvidersConfig {
  const ethProviderUrl = process.env.ETH_PROVIDER_URL
  const polygonProviderUrl = process.env.POLYGON_PROVIDER_URL

  if (!ethProviderUrl) {
    throw new Error("ETH_PROVIDER_URL env variable must be defined")
  }

  if (!polygonProviderUrl) {
    throw new Error("POLYGON_PROVIDER_URL env variable must be defined")
  }

  return {
    ethProviderUrl,
    polygonProviderUrl,
  }
}

async function getTwitterFollowing(username: string, bearerToken?: string) {
  try {
    const twitterToken = bearerToken || process.env.TWITTER_API_BEARER_TOKEN
    if (!twitterToken) {
      throw new Error("TWITTER_API_BEARER_TOKEN env variable must be defined")
    }

    // Initialize Twitter client
    const twitterClient = new TwitterApi(twitterToken)
    const readOnlyClient = twitterClient.readOnly

    // Get Twitter id from the username
    // API quota: 300 every 15 minutes
    const user = await twitterClient.v2.userByUsername(username)
    const userId = user.data.id

    // Get following people
    // API quota: 15 every 15 minutes
    const following = await readOnlyClient.v2.following(userId, {
      max_results: 1000,
      "user.fields": ["description", "profile_image_url"],
    })

    return following
  } catch (err: any) {
    if (err?.code === 429) {
      throw new TooManyRequestsError("Too many requests. Please try again in a few minutes ⌛️")
    }
    throw err
  }
}

function parseLensName(text = ""): string | null {
  const results = text.match(/[a-zA-Z0-9_]+\.lens/)
  return results && results[0]
}

function parseEnsName(text = ""): string | null {
  const results = text.match(/[a-zA-Z0-9_]+\.eth/)
  return results && results[0]
}
