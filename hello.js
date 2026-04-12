#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const USAGE_FILE = path.join(__dirname, "usage.json");
const MAX_LOG_ENTRIES = 100;

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Bonjour";
  if (hour >= 12 && hour < 18) return "Bon après-midi";
  if (hour >= 18 && hour < 22) return "Bonsoir";
  return "Bonne nuit";
}

function logUsage(greeting) {
  let entries = [];
  if (fs.existsSync(USAGE_FILE)) {
    try {
      entries = JSON.parse(fs.readFileSync(USAGE_FILE, "utf-8"));
    } catch {
      entries = [];
    }
  }
  entries.push({
    timestamp: new Date().toISOString(),
    greeting,
  });
  if (entries.length > MAX_LOG_ENTRIES) {
    entries = entries.slice(entries.length - MAX_LOG_ENTRIES);
  }
  fs.writeFileSync(USAGE_FILE, JSON.stringify(entries, null, 2) + "\n");
}

const name = process.argv[2] || "monde";
const greeting = getGreeting();
const message = `${greeting}, ${name} !`;

console.log(message);
logUsage(greeting);
