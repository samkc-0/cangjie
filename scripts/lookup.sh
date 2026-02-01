#!/bin/bash

# Check if an argument is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <character>"
  exit 1
fi

# Convert character to Unicode code point
char="$1"
codepoint="U+$(node -e "console.log('$char'.codePointAt(0).toString(16).toUpperCase())")"

# Unzip and grep for the codepoint, then format as JSON
unzip -p data/unihan.zip Unihan_Readings.txt Unihan_DictionaryLikeData.txt | grep "$codepoint" | awk -F'\t' '
BEGIN {
  # Cangjie component mapping
  CANGJIE_MAP["A"] = "日"; CANGJIE_MAP["B"] = "月"; CANGJIE_MAP["C"] = "金";
  CANGJIE_MAP["D"] = "木"; CANGJIE_MAP["E"] = "水"; CANGJIE_MAP["F"] = "火";
  CANGJIE_MAP["G"] = "土"; CANGJIE_MAP["H"] = "竹"; CANGJIE_MAP["I"] = "戈";
  CANGJIE_MAP["J"] = "十"; CANGJIE_MAP["K"] = "大"; CANGJIE_MAP["L"] = "中";
  CANGJIE_MAP["M"] = "一"; CANGJIE_MAP["N"] = "弓"; CANGJIE_MAP["O"] = "人";
  CANGJIE_MAP["P"] = "心"; CANGJIE_MAP["Q"] = "手"; CANGJIE_MAP["R"] = "口";
  CANGJIE_MAP["S"] = "尸"; CANGJIE_MAP["T"] = "廿"; CANGJIE_MAP["U"] = "山";
  CANGJIE_MAP["V"] = "女"; CANGJIE_MAP["W"] = "田"; CANGJIE_MAP["X"] = "難";
  CANGJIE_MAP["Y"] = "卜";
}
{
  # Store key-value pairs
  key = $2;
  value = $3;
  gsub(/^[ \t]+|[ \t]+$/, "", key);
  gsub(/^[ \t]+|[ \t]+$/, "", value);
  gsub(/"/, "\\\"", value);
  data[key] = value;
}
END {
  printf "{\n";
  first = 1;
  # Sort keys for consistent output
  PROCINFO["sorted_in"] = "@ind_str_asc";
  for (key in data) {
    if (!first) {
      printf ",\n";
    }
    first = 0;
    printf "  \"%s\": \"%s\"", key, data[key];
  }

  # Add kCangjieComponents
  if ("kCangjie" in data) {
    cangjie_code = data["kCangjie"];
    components = "";
    for (i = 1; i <= length(cangjie_code); ++i) {
      char_code = substr(cangjie_code, i, 1);
      if (char_code in CANGJIE_MAP) {
        components = components CANGJIE_MAP[char_code];
      }
    }
    if (components != "") {
      if (!first) {
        printf ",\n";
      }
      printf "  \"%s\": \"%s\"", "kCangjieComponents", components;
    }
  }

  printf "\n}\n";
}'