#!/usr/bin/env node
import { addSpace, addItem, searchItems, listSpaces } from './db.js';

const args = process.argv.slice(2);
const command = args[0];

function showHelp() {
  console.log(`
BinLid — Voice/text inventory tracker

Usage:
  node src/cli.js <command> [options]

Commands:
  add-space <name> [description]     Create a new storage space
  add-item <name> --space <space>    Add an item to a space
           [--location <loc>]         Optional: location within space
           [--description <desc>]     Optional: item description
  search <query>                     Search for items
  list-spaces                        List all storage spaces
  help                               Show this help

Examples:
  node src/cli.js add-space "Cupboard under stairs" "Kitchen storage"
  node src/cli.js add-item "Bin lid" --space "Cupboard under stairs" --location "back left"
  node src/cli.js search "bin lid"
`);
}

async function main() {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  switch (command) {
    case 'add-space': {
      const name = args[1];
      const description = args.slice(2).join(' ') || '';
      if (!name) {
        console.error('Usage: add-space <name> [description]');
        process.exit(1);
      }
      addSpace(name, description);
      break;
    }

    case 'add-item': {
      const name = args[1];
      if (!name) {
        console.error('Usage: add-item <name> --space <space> [--location <loc>] [--description <desc>]');
        process.exit(1);
      }

      // Parse flags
      const spaceIdx = args.indexOf('--space');
      const locationIdx = args.indexOf('--location');
      const descIdx = args.indexOf('--description');

      const spaceName = spaceIdx > -1 ? args[spaceIdx + 1] : null;
      const location = locationIdx > -1 ? args[locationIdx + 1] : '';
      const description = descIdx > -1 ? args[descIdx + 1] : '';

      if (!spaceName) {
        console.error('Missing --space flag');
        process.exit(1);
      }

      addItem(name, spaceName, location, description);
      break;
    }

    case 'search': {
      const query = args.slice(1).join(' ');
      if (!query) {
        console.error('Usage: search <query>');
        process.exit(1);
      }
      searchItems(query);
      break;
    }

    case 'list-spaces': {
      listSpaces();
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main();
