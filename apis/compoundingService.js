const Moralis = require("moralis/node")
const axios = require('axios');
const cheerio = require('cheerio');
const Web3 = require("web3");
const fs = require('fs');
const { last } = require("cheerio/lib/api/traversing");

const Web3Client = new Web3(new Web3.providers.HttpProvider("https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"));

const serverUrl = "https://yf629zawwibk.usemoralis.com:2053/server";

const appId = "d9NSLnMkVB2yKgeuYIP5qB12KIBcYlaKLiphzMl4";

Moralis.start({ serverUrl, appId })

// Get current balance
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


// Sort erc 20 token transaction list
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

// Get Erc token transfer
const getTokenTransfers = async (address, b_num) => {
    let result;
    let midResult = [];
    let lastResult = [];
    const mid =  await transfer(b_num);
    // get mainnet transfers for the current user
    async function transfer(block) {
        const options = { chain: "eth", address: address, from_block: "0", to_block: block};
        const transfers = await Moralis.Web3API.account.getTokenTransfers(options);
        midResult = transfers.result;
        if (midResult.length <500){
            for (var i = 0; i < midResult.length; i++){
                lastResult.push(midResult[i])
            }
            console.log("wallet" + " " + address + ": Total: " + lastResult.length + " " + "tranfers")
            const transactionList = sortTransactionList(lastResult);
            result = transactionList;
        } else {
            for (var i = 0; i < midResult.length; i++){
                lastResult.push(midResult[i])
            }
            console.log("wallet" + " " + address + ": " + lastResult.length + " " +  "tranfers")
            const retrn = await transfer(midResult[midResult.length-1].block_number);
        }
    }
    return result;
};

// Get Erc20 token balance
const getTokenBalances = async (address, block_num, tokenAddress) => {

    const options = { chain: "eth", address: address, to_block: block_num };
    const balances = await Moralis.Web3API.account.getTokenBalances(options);
    let balance;
    for (var i = 0; i < balances.length; i++) {
        if (balances[i].token_address == tokenAddress) {
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

    await contract.methods.balanceOf(walletAddress).call().then((res) => {
        balance = res;
    }).catch((err) => {
        balance = 0;
    })
    return balance;
};

// Get cokmpounding token list
const getCompundingToken = () => {
    async function main() {
        try {
            var addresses = [];
            
            let compoundingTokenList = [];
            let lastBlockNumber;
            let topProtocolCnt;
            let topWalletCnt;

            let protocols;

            // Last blocknumber
            await Web3Client.eth.getBlockNumber()
                .then((res) => {
                    lastBlockNumber = res;
                }).catch((err) => {
                    console.log(err);
                });

            // Get Protocol list

            URL = "https://openapi.debank.com/v1/protocol/list";
            await axios.get(URL).then(({ data }) => {
                protocols = data;
            }).catch((err) => {
                console.log(err);
            });

            fs.readFile('./ConfigurationParameters.json', 'utf-8', function (err, data) {
                if (err) throw err

                midConfiguration(JSON.parse(data));

            })
            var block =[];
            async function midConfiguration(data) {
                topProtocolCnt = data.topProtocolCnt;
                topWalletCnt = data.topWalletCnt;

                // Get Top 20 protocols

                let temp = [];
                for (var i = 0; i < protocols.length - 1; i++) {

                    for (var j = i + 1; j < protocols.length; j++) {
                        if (protocols[i].tvl * 1 < protocols[j].tvl * 1) {
                            temp = protocols[j]
                            protocols[j] = protocols[i];
                            protocols[i] = temp;
                        }
                    }
                }
                let cnt = 0;
                let topProtocol = [];
                for (var k = 0; k < protocols.length; k++) {
                    if (protocols[k].id != "polygon_staking") {
                        if (protocols[k].chain == "eth") {
                            topProtocol[cnt] = protocols[k]
                            cnt++;
                        }
                    }
                    if (cnt >= topProtocolCnt + 2) break;
                }

                fs.writeFile('./topProtocols.json', JSON.stringify(topProtocol), 'utf-8', function (err) {
                    if (err) throw err
                })
                console.log("Top" + " " + topProtocolCnt + " " + "protocols was made into topProtocols.json")

                // Get 100 top wallets
                for (var i = 0; i < topProtocol.length; i++) {
                    let protocolUrl = "https://api.debank.com/project/portfolios/user_list?id=" + topProtocol[i].id;
                    while (1) {
                        let address = [];
                        let sit = 0;
                        await axios.get(protocolUrl).then(({ data }) => {
                            if (data.data.user_list.length > 1) {
                                sit = 1;
                                for (var k = 0; k < data.data.user_list.length; k++) {
                                    if (data.data.user_list[k].user_addr) {
                                        address.push(data.data.user_list[k].user_addr);
                                        sit = 1;
                                    } else {
                                        sit = 0;
                                        break;
                                    }
                                }
                            } else {
                                sit = 0;
                            }

                        });
                        let z = 0;
                        for (var x = 0; x < address.length; x++) {
                            let isContract = await Web3Client.eth.getCode(address[x])
                            if (isContract.length == 2) {
                                addresses.push(address[x]);
                                z++;
                            }
                            if (z >= topWalletCnt) {
                                break;
                            }
                        }
                        break;
                    }
                    if (addresses.length >= topWalletCnt * topProtocolCnt) {
                        break;
                    }
                }

                fs.writeFile('./topWallets.json', JSON.stringify(addresses), 'utf-8', function (err) {
                    if (err) throw err
                })
                console.log("Top" + " " + topWalletCnt * topProtocolCnt + " " + "wallets was made into topWallets.json")
                let compoundingTokens = [];
                for (var i = 0; i < 100; i++) {
                    let tempTransactionList = await getTokenTransfers(addresses[i], lastBlockNumber);
                    for (var j = 0; j < tempTransactionList.length; j++) {
                        let tempBalance = 0;
                        if (tempTransactionList[j][0].address == addresses[i]) {
                            continue;
                        }
                        for (var k = 0; k < tempTransactionList[j].length; k++) {
                            if (tempTransactionList[j][k].to_address == addresses[i]) {
                                tempBalance += tempTransactionList[j][k].value / 100000000;
                            } else {
                                tempBalance -= tempTransactionList[j][k].value / 100000000;
                            }
                        }
                        let currentBalance = await getBalance(addresses[i], tempTransactionList[j][0].address)
                        if (tempBalance == currentBalance / 100000000) {
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
                                compoundingTokens.push(tempTransactionList[j][0], addresses[i]);
                                console.log(compoundingTokenList.length + " " + "candidated compounding token was made")
                                
                            }
                        }
                    }
                }

                fs.writeFile('./candidateCompoundingToken.json', JSON.stringify(compoundingTokens), 'utf-8', function (err) {
                    if (err) throw err
                })
                console.log("candidated compounding token was made into candidateCompoundingToken")
                
                let compCnt = 0;
                
                for (var k = 0; k <  compoundingTokens.length; k = k + 2){
                    blockObj = {
                        coinAddress: "",
                        walletAddress: "",
                        blocks: [

                        ]
                    };
                    let balance1 = await getTokenBalances(compoundingTokens[k + 1], compoundingTokens[k].block_number * 1, compoundingTokens[k].address)
                    let last = await getTokenBalances(compoundingTokens[k + 1], lastBlockNumber, compoundingTokens[k].address)
                    if (balance1 != last) {
                        for (var y = 1; y < 120; y++) {
                            
                            let balance2 = await getTokenBalances(compoundingTokens[k + 1], compoundingTokens[k].block_number * 1 + y, compoundingTokens[k].address)
                            if (balance1 != balance2 && (balance1 != 0 || balance2 != 0)) {
                                blockObj = {
                                    coinAddress: compoundingTokens[k].address,
                                    walletAddress: compoundingTokens[k + 1],
                                    blocks: [
                                        {
                                            blockNumber: compoundingTokens[k].block_number * 1 + y - 1,
                                            balance: balance1
                                        },
                                        {
                                            blockNumber: compoundingTokens[k].block_number * 1 + y,
                                            balance: balance2
                                        }

                                    ]
                                }
                                block.push(blockObj)
                                compCnt++;
                                console.log(compCnt + " " + "Compounding token was made")
                                break;
                            }
                            else {
                                balance1 = balance2
                            }
                        }
                    } else {
                        continue;
                    }
                    // Write compounding token list into json
                    fs.writeFile('./CompoundingList.json', JSON.stringify(block), 'utf-8', function (err) {
                        if (err) throw err
                    })
                       
                }
                console.log("All compounding tokens was made into CompoundingList.json")
            }
            
        } catch (error) {
            console.log(error)
        }
    }
    main();
}

module.exports = {
    getCompundingToken
}
