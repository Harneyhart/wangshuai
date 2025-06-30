#!/bin/bash

ENV=$1

echo "ENV is: " $ENV

echo "Install dependencies..."

git pull

pnpm install

echo "Deploy starting..."

rm -rf .next

mv temp .next

pnpm run db:migrate

pm2 reload schwann-$ENV --update-env

echo "Deploy done."
