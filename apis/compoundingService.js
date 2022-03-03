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

const getCompoundingToken = () => {
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
                var result = [];
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
                        tempBalance = tempBalance.toString() + "00000000";
                        currentBalance = currentBalance.toString();
                        if (tempBalance === currentBalance){
                            continue;
                        } else {
                            if (tempTransactionList[j].length >= 2) {
                                let blockObj;
                                if(tempTransactionList[j][1].block_number != tempTransactionList[j][0].block_number && tempTransactionList[j][1].value.toString() != tempTransactionList[j][0].value.toString()) {
                                    blockObj = {
                                        coinAddress : tempTransactionList[j][0].address,
                                        walletAddress : addresses[i],
                                        blocks : [
                                            {
                                                blockNumber : tempTransactionList[j][1].block_number,
                                                balance : tempTransactionList[j][1].value
                                            },
                                            {
                                                blockNumber : tempTransactionList[j][0].block_number,
                                                balance : tempTransactionList[j][0].value
                                            }
                                        ]
                                    }
                                    block.push(blockObj)
                                }
                            }
                        }
                    }
                    if(block.length >= 1) {
                        result.push(block)
                    }
                }
                var dictstring = JSON.stringify(result);
                fs.writeFile("CompoundingList.json", dictstring, (err) => {
                    if (err) {
                        console.log(err)
                    }
                });
                return resolve({ success : true , fileName : "CompundingList.json" })
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
    getCompoundingToken
}