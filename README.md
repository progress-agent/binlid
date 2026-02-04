# BinLid

Voice/text inventory tracker for storage spaces.

## Quick Start

```bash
npm install
npm start
```

## CLI Usage

```bash
# Add a storage space
node src/cli.js add-space "Cupboard under stairs"

# Add an item
node src/cli.js add-item "Bin lid" --space "Cupboard under stairs" --location "back left"

# Search for items
node src/cli.js search "bin lid"

# Record a move
node src/cli.js move "Bin lid" --to "Garage" --location "shelf B"
```

## Environment

- `BINLID_DB` — SQLite database path (default: `./binlid.db`)
