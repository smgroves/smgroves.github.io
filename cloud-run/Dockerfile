# PlutoSliderServer for the Pluto notebooks in julia/, run on Google Cloud Run.
# The GitHub workflow .github/workflows/pluto-cloud-run.yml assembles the build context as:
#   Dockerfile, pluto-deployment-environment/, notebooks/*.jl
FROM julia:1.11.4

RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user
WORKDIR /home/user/app

COPY --chown=user pluto-deployment-environment ./pluto-deployment-environment
RUN julia --project=pluto-deployment-environment -e 'import Pkg; Pkg.instantiate(); Pkg.precompile()'

COPY --chown=user notebooks ./notebooks

# Run every notebook once at build time so its packages (Plots, PlutoUI, ...) are
# installed and precompiled into the image instead of on each start
RUN julia --project=pluto-deployment-environment -e 'import PlutoSliderServer; PlutoSliderServer.export_directory("notebooks"; Export_output_dir="/tmp/warmup")' \
 && rm -rf /tmp/warmup

# Cloud Run sets PORT (8080 by default)
ENV PORT=8080
EXPOSE 8080
CMD ["julia", "--project=pluto-deployment-environment", "-e", "import PlutoSliderServer; PlutoSliderServer.run_directory(\"notebooks\"; SliderServer_port=parse(Int, ENV[\"PORT\"]), SliderServer_host=\"0.0.0.0\")"]
