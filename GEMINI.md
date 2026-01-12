# Gemini Agent Guidelines

This document provides guidelines for the Gemini agent when working with this repository.

**Important:** This project uses `bun` for package management and running scripts. Do not use `npm` or `yarn`.

## `scripts/lookup.sh`

The `scripts/lookup.sh` script is a utility for looking up character data from the Unihan database.

**Purpose:** This script is intended for use by the Gemini agent for verifying character data, such as Cangjie codes, definitions, and readings, especially when creating or modifying lessons. It provides a quick way to get all the raw data for a given character.

**Usage:**
```bash
./scripts/lookup.sh <character>
```

**Example:**
```bash
./scripts/lookup.sh 好
```

This script should not be used by the application server at runtime. The server has its own implementation for character lookups.
