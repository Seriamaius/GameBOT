const { Client, GatewayIntentBits } = require('discord.js');
const { OpenAI } = require('openai');

require('dotenv').config();

// Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// OpenAI Client
const openai = new OpenAI({
    apiKey: process.env["OPENAI_API_KEY"]
});

// Authenticate Discord
client.login(process.env.DISCORD_TOKEN);

// Discord Bot Ready
client.once('ready', () => {
    console.log('Bot is ready!');
})

// TODO: Replace mapping threads with database
const threadMap = {};

const getOpenAiThreadId = (discordThreadId) => {
    return threadMap[discordThreadId];
}

const addThreadToMap = (discordThreadId, openAiThreadId) => {
    threadMap[discordThreadId] = openAiThreadId;
}

// Loop check openai thread status
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const terminalStates = ["cancelled", "failed", "completed", "expired"];
const statusCheckLoop = async (openAiThreadId, runId) => {
    const run = await openai.beta.threads.runs.retrieve(
        openAiThreadId,
        runId
    );

    if(terminalStates.indexOf(run.status) < 0) {
        await sleep(1000);
        return statusCheckLoop(openAiThreadId, runId);
    }

    return run.status;
}

// Add message to openAi thread
const addMessage = (openAiThreadId, content) => {
    return openai.beta.threads.messages.create(
        openAiThreadId,
        { role: "user", content: content }
    );
}

// Event on receiving a message
client.on('messageCreate', async message => {
    if(message.author.bot || !message.content || message.content === '') return;

    const discordThreadId = message.channel.id;
    let openAiThreadId = getOpenAiThreadId(discordThreadId);

    let messagesLoaded = false;
    if(!openAiThreadId) {
        const thread = await openai.beta.threads.create();
        openAiThreadId = thread.id;
        addThreadToMap(discordThreadId, openAiThreadId);

        if(message.channel.isThread()) {
            // Gather all thread messages
            const starterMsg = await message.channel.fetchStarterMessage();
            const otherMessagesRaw = await message.channel.messages.fetch();
            const otherMessages = Array.from(otherMessagesRaw.values())
                .map(msg => msg.content)
                .reverse();

            const messages = [starterMsg.content, ... otherMessages]
                .filter(msg => !!msg && msg !== '');

            await Promise.all(messages.map(msg => addMessage(openAiThreadId, msg)));
            messagesLoaded = true;
        }
    }

    if(!messagesLoaded) {
        await addMessage(openAiThreadId, message.content);
    }

    const run = await openai.beta.threads.runs.create(
        openAiThreadId,
        { assistant_id: process.env.ASSISTANT_ID}
    );

    const status = await statusCheckLoop(openAiThreadId, run.id);

    const messages = await openai.beta.threads.messages.list(openAiThreadId);
    const response = messages.data[0].content[0].text.value;

    message.reply(response);
})
