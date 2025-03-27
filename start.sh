#!/bin/bash

# this avoids Julia's libgit issues in cloud hosts
export JULIA_PKG_USE_CLI_GIT=true

# run the PlutoSliderServer, pulling notebooks from your repo
julia --project="pluto-deployment-environment" -e '
    import Pkg
    Pkg.instantiate()
    import PlutoSliderServer
    PlutoSliderServer.run_git_directory(".")
'
