#/bin/bash

npm install -g yarn create-react-app

region=$(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone | sed 's/\(.*\)[a-z]/\1/')

cat <<END > ~/.aws/config
[default]
region=$region
END
