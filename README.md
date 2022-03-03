# python_top100_

App to get the compounding erc20 token list

## Installation
- Install dependencies:

```shell
npm install
```

- Run application:

```shell
node index.js

```

- Request
``` 
[GET] localhost:3001
```

## Used Apis
<table role="table">
  <thead>
    <tr>
    <th>Network</th>
    <th>Address</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Moralis Server</td>
      <td><a href="https://53dgjokc0trq.usemoralis.com:2053/server" rel="nofollow">https://53dgjokc0trq.usemoralis.com:2053/server</a></td>
    </tr>
    <tr>
      <td>Ethereum Mainnet Provider</td>
      <td><a href="https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161" rel="nofollow">https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161</a></td>
    </tr>
    <tr>
      <td>100 Top Wallet Address</td>
      <td><a href="https://etherscan.io/accounts/" rel="nofollow">https://etherscan.io/accounts/</a></td>
    </tr>
  </tbody>
</table>

## Methods
- sortTransactionList

```
// Get the transactions history according the token address

const sortTransactionList = (data) => {
  var result = [];
  var flag = [];
  
  ...

  return result;
}
```

- getTokenTransfers

```
// Get the token transactions according to the wallet address
const getTokenTransfers = async (address) => {

  // get mainnet transfers for the current user
  const options = { chain: "eth", address: address, from_block: "0" };
  const transfers = await Moralis.Web3API.account.getTokenTransfers(options);

  const transactionList = sortTransactionList(transfers.result);

  return transactionList;
};
```

- getBalance

```
// Get the current balance according to the wallet address and token address

const getBalance = async (walletAddress, tokenAddress) => {
    
  const contract = new Web3Client.eth.Contract(minABI, tokenAddress);

  let balance;

  await contract.methods.balanceOf(walletAddress).call().then( (res) => {
      balance = res;
  }).catch((err) =>{
      balance = 0;
  })
  return balance;
};
```

-getCompundingToken

```
// This function is called when user send the request to get the compounding token list

const getCompundingToken = () => {
  return new Promise((resolve, reject) => {
    async function main() {
        try {
            ...

        } catch (error) {
            console.log(error)
            return resolve({ success : false })
        }
    }
    main();
  })
}
```

-extractLinks

```
// Get the wallet address from the responsive come from the ethereum api

const extractLinks = $ => [
    ...new Set(
      $('tbody tr td a') // Select pagination links 
          .map((_, a) => $(a).text()) // Extract the href (url) from each link 
          .toArray() // Convert cheerio object to array 
    ),
];
```

## Usage

Just run Application and you can get the compounding erc20 token list

## Output
```
CompundingList.json
```

## Example
```
{
  "coinAddress": 0xda5b4a6a33860fc7aeac9251b1711eede62027ec",
  "walletAddress": "0x0a9e283a9c6f006501f6a365fbceb4a1105dfb7a",
  "blocks": [
    {
        "blockNumber": "12587701",
        "balance": "6000000"
    },
    {
        "blockNumber": "12703784",
        "balance": "50000000"
    }
  ]
},
```
