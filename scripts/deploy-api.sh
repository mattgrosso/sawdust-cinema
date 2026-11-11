#!/bin/sh
# Deploy the sawdust-tickets Lambda (api/). The Resend key comes from
# ~/.config/sawdust-cinema/keys.env (RESEND_API_KEY=...) and goes straight
# into the function's environment; it is never printed. Run `yarn test`
# first; this script does too.
set -e
cd "$(dirname "$0")/.."
npx vitest run api >/dev/null
AWS="${AWS:-$HOME/aws-cli/aws} --profile personal"
F=sawdust-tickets
KEYS="$HOME/.config/sawdust-cinema/keys.env"
RESEND_API_KEY=""
[ -f "$KEYS" ] && . "$KEYS"
[ -n "$RESEND_API_KEY" ] || echo "note: no RESEND_API_KEY in $KEYS - the route will answer 503 until there is one" >&2
rm -f api.zip && (cd api && zip -q ../api.zip index.mjs calendar.mjs package.json)
ENV="Variables={RESEND_API_KEY=$RESEND_API_KEY,MAIL_FROM=Sawdust Cinema <tickets@sawdustcinema.com>,REPLY_TO=${REPLY_TO:-mattgrosso@gmail.com},SITE_URL=https://www.sawdustcinema.com,DATABASE_URL=https://sawdust-cinema-default-rtdb.firebaseio.com}"
if $AWS lambda get-function --function-name $F >/dev/null 2>&1; then
  $AWS lambda update-function-code --function-name $F --zip-file fileb://api.zip >/dev/null
  $AWS lambda wait function-updated --function-name $F
  $AWS lambda update-function-configuration --function-name $F --environment "$ENV" --timeout 20 >/dev/null
  $AWS lambda wait function-updated --function-name $F
else
  ROLE=$($AWS iam get-role --role-name sawdust-tickets-role --query Role.Arn --output text)
  $AWS lambda create-function --function-name $F --runtime nodejs22.x --handler index.handler --role "$ROLE" \
    --zip-file fileb://api.zip --timeout 20 --memory-size 256 --environment "$ENV" >/dev/null
  $AWS lambda wait function-active --function-name $F
  $AWS lambda create-function-url-config --function-name $F --auth-type NONE \
    --cors 'AllowOrigins=https://www.sawdustcinema.com,https://sawdustcinema.com,http://localhost:8080,AllowMethods=POST,AllowHeaders=content-type,MaxAge=3600' >/dev/null
  $AWS lambda add-permission --function-name $F --statement-id public-url --action lambda:InvokeFunctionUrl --principal '*' --function-url-auth-type NONE >/dev/null
  $AWS lambda add-permission --function-name $F --statement-id public-invoke --action lambda:InvokeFunction --principal '*' --invoked-via-function-url >/dev/null 2>&1 || true
fi
rm -f api.zip
$AWS lambda get-function-url-config --function-name $F --query FunctionUrl --output text
