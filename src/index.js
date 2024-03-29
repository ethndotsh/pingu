import fs from "node:fs";
import path from "node:path";
import * as url from "node:url";
import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
import express from "express";
import axios from "axios";

const app = express();

app.get("/", (req, res) => {
  res.send("ok");
});

app.listen(process.env.PORT || 8000);

import dotenv from "dotenv";

dotenv.config();

const { token } = process.env;

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const { default: command } = await import(filePath);

  // Set a new item in the Collection with the key as the command name and the value as the exported module
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
    );
  }
}

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "There was an error while executing this command!",
      ephemeral: true,
    });

    const data = JSON.stringify({
      project: "pingu",
      channel: "errors",
      event: "Command Error",
      description: error.message,
      icon: "💣",
      notify: true,
    });

    axios({
      method: "post",
      url: "https://api.logsnag.com/v1/log",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LOGSNAG_TOKEN}`,
      },
      data: data,
    });
  }
});

// Log in to Discord with your client's token
try {
  client.login(token);
} catch (error) {
  const data = JSON.stringify({
    project: "pingu",
    channel: "errors",
    event: "Bot Crashed",
    description: error.message,
    icon: "💣",
    notify: true,
  });

  axios({
    method: "post",
    url: "https://api.logsnag.com/v1/log",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LOGSNAG_TOKEN}`,
    },
    data: data,
  });
}
