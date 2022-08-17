import { TwitterApi } from "twitter-api-v2"
import dotenv from "dotenv"
import { BigNumber, ethers } from "ethers"

const LENS_CONTRACT_ADDRESS = "0xdb46d1dc155634fbc732f92e853b10b288ad5a1d"

type ProvidersConfig = {
  ethProviderUrl: string
  polygonProviderUrl: string
}

type Handle = {
  twitter: string
  lens: string
}

dotenv.config()

const username = process.argv[2]
if (!username) {
  throw new Error("A username must be provided as an argument")
}

run(username)

async function run(username: string) {
  const providersConfig = getProvidersConfig()

  // Initialize providers
  const ethProvider = new ethers.providers.JsonRpcProvider(providersConfig.ethProviderUrl)
  const polygonProvider = new ethers.providers.JsonRpcProvider(providersConfig.polygonProviderUrl)

  // Get Twitter following
  const following = await getTwitterFollowing(username)
  if (!following) {
    throw new Error(`There is no Twitter profile for the username: ${username}`)
  }

  const profiles: Handle[] = []

  // May become subject to some limit if too many users
  const promises = following.data.map(async (follower) => {
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
      profiles.push({ twitter: follower.username, lens: lensName })
      console.log(`Found @${follower.username} => ${lensName}`)
    }
  })
  await Promise.all(promises)

  // Print the .lens profiles
  console.log("")
  console.log("Lens friends:")
  profiles.forEach((profile) => console.log(`@${profile.twitter} => ${profile.lens}`))
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

async function getTwitterFollowing(username: string) {
  try {
    const twitterToken = process.env.TWITTER_API_BEARER_TOKEN
    if (!twitterToken) {
      throw new Error("TWITTER_API_BEARER_TOKEN env variable must be defined")
    }

    // Initialize Twitter client
    const twitterClient = new TwitterApi(twitterToken)
    const readOnlyClient = twitterClient.readOnly

    // Get Twitter id from the username
    // API quota: 300/m
    const user = await twitterClient.v2.userByUsername(username)
    const userId = user.data.id

    // Get following people
    // API quota: 15/m
    const following = await readOnlyClient.v2.following(userId, {
      max_results: 1000,
      "user.fields": ["description"],
    })

    return following
  } catch (err) {
    return null
  }
}

function parseLensName(text = ""): string | null {
  const results = text.match(/[a-zA-Z0-9_]*\.lens/)
  return results && results[0]
}

function parseEnsName(text = ""): string | null {
  const results = text.match(/[a-zA-Z0-9_]*\.eth/)
  return results && results[0]
}