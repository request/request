# Fork Guidelines

This fork is meant to always follow changes in the `upstream`. 
That is, there should be no changes done in this fork which would prevent drop in replacement of `postman-request` with `request`
(and vice-versa)

## Setting up for maintainance

1. Clone this repository

        git clone https://github.com/postmanlabs/postman-request.git

2. Create another git origin, so that we can easily track upstream changes, and merge them as necessary.

        git remote add upstreamrepo https://github.com/user/repo.git

3. Fetch commits from the upstream

        git fetch upstreamrepo
        
4. Checkout a local branch from the upstream master

        git checkout --track upstreammaster upstreamrepo/master

You can now merge in upstream changes as required,

    git checkout master
    git merge upstreammaster
