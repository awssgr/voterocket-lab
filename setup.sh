#!/usr/bin/env bash

read -p "This will remove any prior lab environments and set up a new one. Proceed (y/n)? " -n 1 -r
echo    # (optional) move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]
then
  echo Cleaning up previous environment. Please wait...
  cd ~/environment/voterocket && yes | amplify delete > /dev/null 2>&1
  rm -rf ~/environment/voterocket
  echo Done cleaning up

  echo Setting up new environment. Please wait...

  npm install -g yarn create-react-app

  region=$(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone | sed 's/\(.*\)[a-z]/\1/')

  cat <<END > ~/.aws/config
[default]
region=$region
END

  echo Done setting up
else
  echo OK. No changes were made
fi
