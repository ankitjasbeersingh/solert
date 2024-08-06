const solanaweb3 = require('@solana/web3.js');

//Connect to a Solana cluster
const connection = new solanaweb3.Connection(solanaweb3.clusterApiUrl('mainnet-beta'),'confirmed');
async function monitorTransactions(){
    connection.onLogs('all',(log)=>{
        console.log('Transaction log:', log);
        filterLargeTransactions(log)
        
    })
}

monitorTransactions();

async function filterLargeTransactions(log) {
    // Parse transaction details
    const transactionDetails = await connection.getTransaction(log.signature);
    console.log(transactionDetails);
}

