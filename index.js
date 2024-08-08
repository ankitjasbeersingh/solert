const solanaweb3 = require('@solana/web3.js');

//Connect to a Solana cluster
const connection = new solanaweb3.Connection(solanaweb3.clusterApiUrl('mainnet-beta'),'confirmed');
const queue = [];
let processing = false;
let latestSignature = null;
async function monitorTransactions(){
    connection.onLogs('all',async (log)=>{
        if (latestSignature && log.signature <= latestSignature) {
            // Ignore past transactions
            return;
        }
        latestSignature = log.signature;
        queue.push(log);
        processQueue();
        
    })
}

async function processQueue() {
    if (processing) return;
  
    processing = true;
    while (queue.length > 0) {
      const log = queue.shift();
      await filterLargeTransactions(log);
      await delay(5000); // Delay between processing each log to avoid rate limits
    }
    processing = false;
  }

  async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async function fetchTransactionDetails(signature, attempt = 0) {
    const maxAttempts = 5;
    const delayTime = Math.min(500 * (2 ** attempt), 16000); // Exponential backoff with cap
  
    try {
      const transactionDetails = await connection.getTransaction(signature, { maxSupportedTransactionVersion: 0 });
      if (!transactionDetails) {
        console.log(`Transaction details not found for signature: ${signature}`);
        return null;
      }
      return transactionDetails;
    } catch (error) {
      if (error.message.includes('429') || error.message.includes('UND_ERR_CONNECT_TIMEOUT')) {
        if (attempt < maxAttempts) {
          console.log(`Rate limited or timeout. Retrying after ${delayTime}ms... (Attempt ${attempt + 1})`);
          await delay(delayTime);
          return fetchTransactionDetails(signature, attempt + 1);
        } else {
          console.error(`Max retry attempts reached for signature: ${signature}`);
          return null;
        }
      } else {
        throw error;
      }
    }
  }
  
  async function filterLargeTransactions(log) {
    try {
      const transactionDetails = await fetchTransactionDetails(log.signature);
      if (transactionDetails) {
        const amountTransferred = transactionDetails.meta.postBalances[0] - transactionDetails.meta.preBalances[0];
        const largeTransactionThreshold = 1000 * solanaweb3.LAMPORTS_PER_SOL;
        if (amountTransferred >= largeTransactionThreshold) {
            console.log('Large transaction detected:', transactionDetails);
            // Process large transaction (e.g., send alert)
        }
      }
    } catch (error) {
      console.error(`Error fetching transaction details for signature: ${log.signature}`, error);
    }
  }

monitorTransactions();

// async function filterLargeTransactions(log) {
//     // Parse transaction details
//     const transactionDetails = await connection.getTransaction(log.signature, { maxSupportedTransactionVersion: 0 });
//     if (transactionDetails) {
//         console.log(transactionDetails);
//         // Add your filtering logic here
//       }
// }

