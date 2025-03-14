cd(@__DIR__)

@assert VERSION >= v"1.6.0"

import Pkg
Pkg.activate("./pluto-deployment-environment")
Pkg.instantiate()
import PlutoPages

# Set the correct path for developing Pluto notebooks
PlutoPages.develop(joinpath(@__DIR__, "julia"))