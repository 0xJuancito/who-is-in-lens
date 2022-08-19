import { findFriends } from "./index"

const username = process.argv[2]
if (!username) {
  throw new Error("A username must be provided as an argument")
}

async function main() {
  const profiles = await findFriends(username)

  // Print the .lens profiles
  console.log("")
  console.log("Lens friends:")
  profiles.forEach((profile) => console.log(`@${profile.twitter} => ${profile.lens}`))

  console.log("")
  console.log(`Found ${profiles.length} frens in Lens!! :)`)
}

main()
