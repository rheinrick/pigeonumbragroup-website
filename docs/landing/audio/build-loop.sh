#!/bin/sh
set -eu
"${PYTHON:-python3}" docs/landing/audio/build-loop.py "${1:?Pass the original MP3 as argument}"
