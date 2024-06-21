import { message, result, spawn, createDataItemSigner } from "@permaweb/aoconnect";

const displayContainer = document.getElementById('contentDiv');
const pidSelect = document.getElementById('pidSelect');
const pidInput = document.getElementById('pid');

let wallet = '';
let pid = '';

const pidMap = new Map();

const getResult = async (MsgId, ProcessTxId) => {

    //读取消息ID返回的数据
    let { Output } = await result({
        message: MsgId,
        process: ProcessTxId,
    });
    // console.log("msgResult:",Output.data);
    return Output.data.output;
};

const sendMsg = async (processId, Msg) => {
    const messageId = await message({
        process: processId,
        tags: [{name: 'SDK', value: 'aoconnect'}, {name: 'Action', value: 'Eval'}],
        signer: createDataItemSigner(window.arweaveWallet),
        data: Msg,
    });
    // console.log("messageId:", messageId);
    return await getResult(messageId, processId);
};


const createProcess = async (processName) => {
    const tags = [
        { name: "App-Name", value: "aos" },
        { name: "aos-Version", value: "1.10.30" },
        { name: "Name", value: processName },
    ];
    const processTxId = await spawn({
        module: "SBNb1qPQ1TDwpD_mboxm2YllmMLXpWw4U8P9Ff8W9vk",
        scheduler: "_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA",
        signer: createDataItemSigner(window.arweaveWallet),
        tags: tags,
    });

    // console.log("AoCreateProcess processTxId", processTxId);

    return processTxId;
};

const queryPids = async () => {
    const headers = {
        'Content-Type': 'application/json',
    };
    let nextCursor = null;
    while (true) {
        const jsonData = {
            variables: {
                addresses: [`${wallet}`],
                first: 1000,
                after: nextCursor
            },
            query: `query ($addresses:[String!]!, $first: Int!, $after: String) {
                transactions (
                    first: $first,
                    after: $after,
                    owners: $addresses, 
                    tags: [
                        { name: "Data-Protocol", values: ["ao"] },
                        { name: "Variant", values: ["ao.TN.1"] },
                        { name: "Type", values: ["Process"]},
                        { name: "Name", values: [""]}
                    ]
                ) {
                    edges {
                        node {
                            id
                            tags {
                                name
                                value
                            }
                            
                        }
                        cursor
                    }
                }
            }`
        };
        const response = await fetch('https://arweave-search.goldsky.com/graphql', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(jsonData)
        });
        const result = await response.json();
        if (result.data.transactions.edges.length === 0) {
            break;
        }
        for (const info of result.data.transactions.edges) {
            for (const tag of info.node.tags) {
                if (tag.name === 'Name') {
                    pidMap.set(tag.value, info.node.id);
                }
            }
        }
        nextCursor = result.data.transactions.edges[result.data.transactions.edges.length - 1].cursor;
    }

}



pidSelect.addEventListener('change', function() {
    // 这里可以访问当前选中的值
    const selectedPid = this.value;
    if (selectedPid === 'new process') {
        pidInput.disabled = false;
        pidInput.value = '';
        pid = '';
    }else {

        pidInput.value = pidMap.get(selectedPid);
        pidInput.disabled = true;
    }
    document.getElementById('connect').innerText = 'connect';
});

const populatePidSelect = async () => {
    pidMap.clear();
    initPidSelect();
    await queryPids().then(() => {
        // console.log(pidMap);
        pidMap.forEach((value, key) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = key;
            pidSelect.appendChild(option);
        });
    });
}

function initPidSelect() {
    pidSelect.innerText = '';
    const createOption = document.createElement('option');
    createOption.value = 'new process'; // 可以设置为一个特定的值，例如 'create'
    createOption.textContent = 'new process';
    pidSelect.appendChild(createOption);
}

// 将内容添加到显示容器的函数
const appendContent = (content, result) => {
    if (!result) {
        content = 'aos> ' + content;
    }
    const newContentDiv = document.createElement('div');
    newContentDiv.classList.add('display-item');
    newContentDiv.textContent = content;
    newContentDiv.style.color = result ? 'white' : 'red' ;
    newContentDiv.style.whiteSpace = 'pre-line';
    displayContainer.appendChild(newContentDiv);
    displayContainer.scrollTop = displayContainer.scrollHeight;
};

//页面初始化加载
document.addEventListener('DOMContentLoaded', async function () {
    appendContent('please connect to arconnect and aos',true);
    await populatePidSelect();
    if (window.arweaveWallet) {
        wallet = await window.arweaveWallet.getActiveAddress();
        if (wallet) {
            document.getElementById('arConncet').textContent = wallet.substring(0, 5) + '...';
            populatePidSelect();
        }
    }
});

document.getElementById('arConncet').addEventListener('click', async () => {
    if (window.arweaveWallet && !wallet) {
        await window.arweaveWallet.connect(['ACCESS_ADDRESS', 'SIGN_TRANSACTION']);
        wallet = await window.arweaveWallet.getActiveAddress();
        document.getElementById('arConncet').textContent = wallet.substring(0, 10) + '...';
        populatePidSelect();
    } else if (wallet) {
        await window.arweaveWallet.disconnect();
        wallet = '';
        document.getElementById('arConncet').textContent = 'ArConnect';
        pidMap.clear();
        initPidSelect();
    }else if (!window.arweaveWallet) {
        alert("Please install Arweave Wallet");
    }
});

// 为按钮1添加事件监听器
document.getElementById('connect').addEventListener('click', async () => {
    const selectPid = pidSelect.value;
    if (selectPid === 'new process') {
        await createProcess(pidInput.value).then(processId => {
            pid = processId;
            pidMap.set(pidInput.value,processId);
            const option = document.createElement('option');
            option.value = pidInput.value;
            option.textContent = pidInput.value;
            pidSelect.appendChild(option);
            pidSelect.value = pidInput.value;
            pidInput.value = processId;
        });
    } else {
        pidInput.value = pidMap.get(selectPid);
        pid = pidMap.get(selectPid);
    }
    pidInput.disabled = true;
    appendContent('connect success',true);
});

// 为按钮2添加事件监听器
document.getElementById('send').addEventListener('click', async () => {
    if (!wallet) {
        appendContent('please connect to arconnect first',true);
        return;
    }
    if (!pid) {
        appendContent('please connect to ao first',true);
        return;
    }
    const inputText = document.getElementById('msg').value;
    if (!inputText) {
        return;
    }
    document.getElementById('send').disabled = true;
    document.getElementById('msg').disabled = true;
    if (inputText.startsWith('.load ')) {
        appendContent(inputText, false);
        document.getElementById('overlay').style.display = 'flex'; // 显示覆盖层
        document.getElementById('msg').disabled = false;
    } else if (inputText === '.load-blueprint chat') {
        appendContent(inputText, false);
        // document.getElementById('send').disabled = true;
        fetch("https://raw.githubusercontent.com/permaweb/aos/main/blueprints/chat.lua").then((response)=>{
            response.text().then(async (inputData) => {
                // console.info(inputData)
                await sendMsg(pid, inputData).then(resultMsg => {
                    resultMsg = cleanAnsiString(resultMsg);
                    appendContent(resultMsg, true);
                    document.getElementById('send').disabled = false;
                    document.getElementById('msg').value = '';
                    document.getElementById('msg').disabled = false;
                });
            })
        })
    }else {
        document.getElementById('overlay').style.display = 'none'; // 隐藏覆盖层
        if (inputText) {
            appendContent(inputText, false);
        }
        try {
            await sendMsg(pid, inputText).then(resultMsg => {
                appendContent(resultMsg, true);
                document.getElementById('msg').value = '';
                document.getElementById('send').disabled = false;
                document.getElementById('msg').disabled = false;
            });
        } catch (error) {
            console.error('Error fetching Messages:', error);
            appendContent('Error loading data');
        }
    }
});

function cleanAnsiString(str) {
    // 移除ANSI转义代码
    var withoutAnsi = str.replace(/\u001b\[.*?m/g, '');

    const withBreaks = withoutAnsi.replace(/\t/g, '    ');

    return withBreaks;
}
// 返回页面
document.getElementById('back').addEventListener('click', async () => {
    document.getElementById('overlay').style.display = 'none'; // 隐藏覆盖层
    document.getElementById('msg').value = '';
});
// 发送脚本
document.getElementById('sendLua').addEventListener('click', async () => {
    document.getElementById('overlay').style.display = 'none'; // 隐藏覆盖层
    const inputText = document.getElementById('large-input').value;
    if (inputText) {
        document.getElementById('sendLua').disabled = true;
    }
    document.getElementById('send').disabled = true;
    try {
        await sendMsg(pid, inputText).then(resultMsg => {
            appendContent(resultMsg, true);
            document.getElementById('send').disabled = false;
            document.getElementById('msg').value = '';
        });
    } catch (error) {
        console.error('Error fetching Messages:', error);
        appendContent('Error loading data',true);
    }
});

