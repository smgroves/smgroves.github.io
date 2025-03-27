FROM julia:1.10

# Install PlutoSliderServer dependencies
RUN julia -e 'using Pkg; Pkg.add(["Pluto", "PlutoSliderServer"]); Pkg.precompile()'

# Copy your repo contents into the container
WORKDIR /app
COPY . /app

# Make sure PlutoSliderServer gets its environment
RUN julia --project=pluto-deployment-environment -e 'using Pkg; Pkg.instantiate()'

EXPOSE 8080

CMD ["julia", "--project=pluto-deployment-environment", "-e", "using PlutoSliderServer; PlutoSliderServer.run_git_directory(\".\")"]
