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
    } else return 0;

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
                for (var i = 1; i < 5; i++) {
                    URL = "https://etherscan.io/accounts/" + i.toString();
                    await axios.get(URL).then(({ data }) => {
                        const $ = cheerio.load(data); // Initialize cheerio 
                        const tempAddresses = extractLinks($);
                        for (var j = 0; j < tempAddresses.length; j++) {
                            addresses.push(tempAddresses[j]);
                        }

                    });
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
                            if (tempTransactionList[j].length >= 2) {
                                let blockObj = {
                                    coinAddress : "",
                                    walletAddress : "",
                                    blocks : [
                                        
                                    ]
                                };
                                for (var x = 0; x < tempTransactionList[j].length -1; x ++) {
                       
                                    if ( tempTransactionList[j][x].block_number * 1 == tempTransactionList[j][x+1].block_number * 1 + 1 ){
                                        let getTokenBalance1 = await getTokenBalances(addresses[i], tempTransactionList[j][x + 1].block_number, tempTransactionList[j][x].address)
                                        let getTokenBalance2 = await getTokenBalances(addresses[i], tempTransactionList[j][x].block_number, tempTransactionList[j][x].address)
                                        blockObj = {
                                            coinAddress : tempTransactionList[j][x].address,
                                            walletAddress : addresses[i],
                                            blocks : [
                                                {
                                                    blockNumber : tempTransactionList[j][x + 1].block_number,
                                                    balance : getTokenBalance1
                                                },
                                                {
                                                    blockNumber : tempTransactionList[j][x].block_number,
                                                    balance : getTokenBalance2
                                                }
                                            ]
                                        }
                                        block.push(blockObj)
                                    }
                                    if( blockObj.blocks.length == 0){
                                        continue;
                                    } else {
                                        break;
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