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

function logUsage(greeting, name) {
  let entries = [];
  if (fs.existsSync(USAGE_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(USAGE_FILE, "utf-8"));
      entries = Array.isArray(parsed) ? parsed : [];
    } catch {
      entries = [];
    }
  }
  entries.push({
    timestamp: new Date().toISOString(),
    greeting,
    name,
  });
  if (entries.length > MAX_LOG_ENTRIES) {
    entries = entries.slice(entries.length - MAX_LOG_ENTRIES);
  }
  try {
    fs.writeFileSync(USAGE_FILE, JSON.stringify(entries, null, 2) + "\n");
  } catch (err) {
    console.error("Warning: could not write usage log:", err.message);
  }
}

if (["--help", "-h"].includes(process.argv[2])) {
  console.log("Usage: node hello.js [name]");
  process.exit(0);
}

const name = (process.argv[2] || "monde").slice(0, 50);
const greeting = getGreeting();
const message = `${greeting}, ${name}\u00A0!`;

console.log(message);
logUsage(greeting, name);
