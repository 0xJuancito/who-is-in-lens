# who-is-in-lens

Find your friends from Twitter in [Lens Protocol](https://lens.xyz/) 🌿

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

<img width="425" alt="Screen Shot 2022-08-17 at 19 46 41" src="https://user-images.githubusercontent.com/12957692/185256807-7f75ed1b-eb00-4543-bda3-793d7645c207.png">

## Limits

- Twitter API limits *following* requests to 15/min and username->id to 300/min
- Requests to resolve `.eth` names + lens profiles are all made in parallel. They may be subject to limits if too many users are queried at the same time
