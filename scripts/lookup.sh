#!/bin/bash

# Check if an argument is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <character>"
  exit 1
fi

# Convert character to Unicode code point
char="$1"
codepoint="U+$(node -e "console.log('$char'.charCodeAt(0).toString(16).toUpperCase())")"

# Unzip and grep for the codepoint, then format as JSON
unzip -p data/unihan.zip Unihan_Readings.txt Unihan_DictionaryLikeData.txt | grep "$codepoint" | awk -F'\t' '
BEGIN {
  printf "{\n"
  first=1
}
{
  # Escape double quotes in the value
  gsub(/"/, "\\\"", $3)
  
  if (!first) {
    printf ",\n"
  }
  first=0
  
  # Trim leading/trailing whitespace from key and value
  key=$2
  value=$3
  gsub(/^[ \t]+|[ \t]+$/, "", key)
  gsub(/^[ \t]+|[ \t]+$/, "", value)
  
  printf "  \"%s\": \"%s\"", key, value
}
END {
  printf "\n}\n"
}'