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

// Event on receiving a message
client.on('messageCreate', async message => {
    if(message.author.bot || !message.content || message.content === '') return;
    message.reply("Tainted Grail est le meilleur jeu!");
})

