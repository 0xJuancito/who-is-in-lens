# who-is-in-lens

​
Find your friends from Twitter in [Lens](https://lens.xyz/) 🍃

## Description

`who-is-in-lens` checks the list of people you are _following_ on Twitter, and scans their name and description to find any `.lens` handle. It also looks for `.eth` ENS names and checks if the person has a Lens profile associated to it.

## Prerequisites

- Node.js
- API Bearer Token from a Twitter Developer Account
- API key for Ethereum and Polygon providers (Infura/Alchemy/Other)

## Configuration

- Create an `.env` file with the following attributes:
  - `TWITTER_API_BEARER_TOKEN` for retrieving the following list
  - `ETH_PROVIDER_URL` for resolving `.eth` ENS names
  - `POLYGON_PROVIDER_URL` for looking for associated Lens profiles in the Lens contract

## Use

Replace `{twitterHandle}` with the corresponding handle:

```
$ ts-node src/index.ts {twitterHandle}
```
