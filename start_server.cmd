@echo off
echo Starting QueueBit Server...
echo.
node src/server-runner.js --debug --port=3333 --persistent-queue --queue-dir=./data