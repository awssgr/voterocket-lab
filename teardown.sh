#/bin/bash

# The s3 bucket removal may need to be done manually. I think its also OK for these to hang around
# until the whole account gets deleted. New deploys will create new buckets anyway.
#
# If required the bucket name can be found by using "cat ~/environment/voterocket/amplify/team-provider-info.json"
# before using the amplify delete command:

aws s3 rb --force s3://voterocket-2019nnnnnnnnnn-deployment

amplify delete
rm -rf ~/environment/voterocket
