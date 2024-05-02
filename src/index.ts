import { openai } from "@ai-sdk/openai";
import {
  CoreAssistantMessage,
  CoreToolMessage,
  CoreUserMessage,
  generateText,
  tool,
} from "ai";
import dotenv from "dotenv";
import * as readline from "node:readline/promises";
import { z } from "zod";

dotenv.config();

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const messages: Array<
  CoreUserMessage | CoreAssistantMessage | CoreToolMessage
> = [];

function getWeather({ city, unit }) {
  // This function would normally make an
  // API request to get the weather.

  const weathers = ["Sunny", "Rainy", "Cloudy", "Foggy", "Snowy"];

  const tempInC = Math.floor(Math.random() * 30);
  const tempInF = Math.round((tempInC * 9) / 5 + 32);

  return {
    value: unit === "C" ? tempInC : tempInF,
    unit,
    description: weathers[Math.floor(Math.random() * weathers.length)],
  };
}

async function main() {
  const context = {
    model: openai("gpt-3.5-turbo"), // openai("gpt-4-turbo"),
    system:
      "You are a friendly weather assistant! If the user asks non-weather related questions, you should respond with 'I don't know'",
    tools: {
      getWeather: tool({
        description: "Get the weather for a location",
        parameters: z.object({
          city: z.string().describe("The city to get the weather for"),
          unit: z
            .enum(["C", "F"])
            .describe(
              "The unit to display the temperature in, either Celcius (C) or Fahrenheit (F)"
            ),
        }),
        execute: async ({ city, unit }) => {
          // console.log("getWeather", city, unit);
          const weather = getWeather({ city, unit });
          return weather;
        },
      }),
    },
  };
  while (true) {
    const userInput = await terminal.question("You: ");

    messages.push({ role: "user", content: userInput });

    const { text, toolResults, toolCalls } = await generateText({
      ...context,
      messages,
    });

    if (toolResults && toolCalls) {
      messages.push({
        role: "assistant" as const,
        content: toolCalls,
      });

      messages.push({
        role: "tool" as const,
        content: toolResults,
      });

      // console.dir(messages, { depth: null });

      const { text: finalText } = await generateText({
        ...context,
        messages,
      });
      messages.push({ role: "assistant", content: finalText });
      process.stdout.write(`Assistant: ${finalText}\n`);
    } else {
      messages.push({ role: "assistant", content: text });
      process.stdout.write(`Assistant: ${text}\n`);
    }
  }
}

main().catch(console.error);
