document.addEventListener('DOMContentLoaded', async () => {
    if (!window.arweaveWallet) {
        document.getElementById('notification').style.display = 'block';
    } else {
        try {
            if (window.arweaveWallet) {
                const permissions = await window.arweaveWallet.getPermissions();
                if (permissions.includes('ACCESS_ADDRESS')) {
                    document.getElementById("connectButton").innerText = "Already connected to Arconnect";
                    document.getElementById("connectButton").style.background = "#a5feff";
                    document.getElementById("connectButton").disabled = true;
                }else {
                    await window.arweaveWallet.connect(['ACCESS_ADDRESS', 'SIGN_TRANSACTION']);
                }
            }
        } catch (error) {
            console.error('Failed to connect to Arweave:', error);
        }
    }
    document.getElementById("connectButton").addEventListener('click', async() => {
        if (window.arweaveWallet) {
            await window.arweaveWallet.connect(['ACCESS_ADDRESS', 'SIGN_TRANSACTION']);
            document.getElementById("connectButton").innerText = "Already connected to Arconnect";
            document.getElementById("connectButton").style.background = "#a5feff";
            document.getElementById("connectButton").disabled = true;
        } else {
            alert("Please install Arweave Wallet");
        }
    })
});
