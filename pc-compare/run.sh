#!/bin/sh
cd "$(dirname "$0")" || exit 1
if command -v python3 >/dev/null 2>&1; then
  exec python3 server/server.py "$@"
elif command -v python >/dev/null 2>&1; then
  exec python server/server.py "$@"
else
  echo "Python topilmadi. https://www.python.org/downloads/ dan o'rnating."
  exit 1
fi
