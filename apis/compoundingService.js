const Moralis = require("moralis/node")
const axios = require('axios');
const cheerio = require('cheerio');
const Web3 = require("web3");
const fs = require('fs');

const Web3Client = new Web3(new Web3.providers.HttpProvider("https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"));

const serverUrl = "https://53dgjokc0trq.usemoralis.com:2053/server";

const appId = "Ya9oUVMjeupUa0Fvw2cZ4msiM7566PkaOi25IeRg";

Moralis.start({ serverUrl, appId })


const minABI = [
    // balanceOf
    {
        constant: true,
        inputs: [{ name: "_owner", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "balance", type: "uint256" }],
        type: "function",
    },
    //transfer
    {
        constant: false,
        inputs: [{ name: "_to", type: "address" }, { name: "_value", type: "uint256" }],
        name: "transfer",
        outputs: [{ name: '', type: "bool" }],
        type: "function"
    }
];

const sortTransactionList = (data) => {
    var result = [];
    var flag = [];
    for (var i = 0; i < data.length; i++) {
        flag[i] = 0;
    }
    for (var i = 0; i < data.length; i++) {
        let order = [];
        if (flag[i] == 0) {
            order.push(data[i]);
            flag[i] = 1;
        } else {
            continue;
        }

        for (var j = i + 1; j < data.length; j++) {
            let temp;
            if (data[i].address == data[j].address && flag[j] == 0) {
                order.push(data[j])
                flag[j] = 1;
            }
        }
        result.push(order);
    }

    return result;
}

const getTokenTransfers = async (address) => {

    // get mainnet transfers for the current user
    const options = { chain: "eth", address: address, from_block: "0" };
    const transfers = await Moralis.Web3API.account.getTokenTransfers(options);

    const transactionList = sortTransactionList(transfers.result);

    return transactionList;
};

const getTokenBalances = async (address, block_num, tokenAddress) => {

    const options = { chain: "eth", address: address, to_block: block_num };
    const balances = await Moralis.Web3API.account.getTokenBalances(options);
    let balance;
    for ( var i = 0; i < balances.length; i++){
        if ( balances[i].token_address == tokenAddress){
            balance = balances[i].balance;
            break;
        }
    }
    
    if (balance) {
        return balance;
    } else {
        return 0;
    }

}

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
const getCompundingToken = () => {
    return new Promise((resolve, reject) => {
        async function main() {
            try {
                var addresses = [];
                let cnt = 0;
                let compoundingTokenList = [];
                let lastBlockNumber;
                await Web3Client.eth.getBlockNumber()
                .then( (res) => {
                    lastBlockNumber = res;
                }).catch((err) => {
                    console.log(err);
                });
                while(1) {
                    cnt++;
                    URL = "https://etherscan.io/accounts/" + cnt.toString();
                    var midAddress = [];
                    await axios.get(URL).then(({ data }) => {
                        const $ = cheerio.load(data); // Initialize cheerio 
                        const tempAddresses = extractLinks($);
                        for (var j = 0; j < tempAddresses.length; j++) {
                            midAddress.push(tempAddresses[j]);
                        }
                    });
                    for (var i = 0; i < midAddress.length; i++) {
                        let isContract = await Web3Client.eth.getCode(midAddress[i]);
                        if (isContract.length == 2){
                            addresses.push(midAddress[i])
                        }
                    }
                    if (addresses.length >= 100) break;
                }
                for (var i = 0; i < 100; i++) {
                    let tempTransactionList = await getTokenTransfers(addresses[i]);
                    let block = [];
                    for (var j = 0; j < tempTransactionList.length; j++) {
                        let tempBalance = 0;
                        if (tempTransactionList[j][0].address == addresses[i]) {
                            continue;
                        } 
                        for (var k = 0; k < tempTransactionList[j].length; k++) {
                            if (tempTransactionList[j][k].to_address == addresses[i]) {
                                tempBalance += tempTransactionList[j][k].value/100000000;
                            } else {
                                tempBalance -= tempTransactionList[j][k].value/100000000;
                            }
                        }
                        let currentBalance = await getBalance(addresses[i], tempTransactionList[j][0].address)
                        if (tempBalance == currentBalance/100000000){
                            continue;
                        } else {
                            let flag = 0;
                            for (var x = 0; x < compoundingTokenList.length; x++) {
                                if (tempTransactionList[j][0].address == compoundingTokenList[x]) {
                                    flag = 1;
                                    break;
                                }
                            }
                            if (flag == 0) {
                                compoundingTokenList.push(tempTransactionList[j][0].address);

                                let blockObj = {
                                    coinAddress : "",
                                    walletAddress : "",
                                    blocks : [
                                        
                                    ]
                                };
                                if (tempTransactionList[j].length == 1) {
                                    let balance1 = await getTokenBalances(addresses[i], tempTransactionList[j][0].block_number * 1 , tempTransactionList[j][0].address)
                                    let last = await getTokenBalances(addresses[i], lastBlockNumber , tempTransactionList[j][0].address)
                                    if ( balance1 != last ){
                                        console.log(tempTransactionList[j][0])
                                        for( var y = 1; y < 500; y ++){
                                            let balance2 = await getTokenBalances(addresses[i], tempTransactionList[j][0].block_number * 1 + y  , tempTransactionList[j][0].address)
                                            if (balance1 != balance2 && (balance1 != 0 || balance2 != 0)) {
                                                blockObj = {
                                                    coinAddress : tempTransactionList[j][0].address,
                                                    walletAddress : addresses[i],
                                                    blocks : [
                                                        {
                                                            blockNumber : tempTransactionList[j][0].block_number * 1 + y-1,
                                                            balance : balance1
                                                        },
                                                        {
                                                            blockNumber : tempTransactionList[j][0].block_number * 1 + y,
                                                            balance : balance2
                                                        }
                                                       
                                                    ]
                                                }
                                                block.push(blockObj)
                                                break;
                                            }
                                            else{
                                                balance1 = balance2
                                            }
                                        }
                                    } else {
                                        continue;
                                    }
                                }
                            }
                        }
                    }
                    if(block.length > 0) {
                        fs.readFile('./CompoundingList.json', 'utf-8', function(err, data) {
                            if (err) throw err
                        
                            var arrayOfObjects = JSON.parse(data)
                            arrayOfObjects.push(block)
                        
                            fs.writeFile('./CompoundingList.json', JSON.stringify(arrayOfObjects), 'utf-8', function(err) {
                                if (err) throw err
                                console.log('Done!')
                            })
                        })
                    }
                }
                console.log('Finished!')
                return resolve({ success : true , fileName : "CompoundingList.json" })
            } catch (error) {
                console.log(error)
                return resolve({ success : false })
            }
        }
        main();
    })
}

const extractLinks = $ => [
    ...new Set(
        $('tbody tr td a') // Select pagination links 
            .map((_, a) => $(a).text()) // Extract the href (url) from each link 
            .toArray() // Convert cheerio object to array 
    ),
];

module.exports = {
    getCompundingToken
}