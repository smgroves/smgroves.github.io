# PlutoSliderServer for the Pluto notebooks in julia/, run as a Hugging Face Docker Space.
# The GitHub workflow .github/workflows/pluto-space.yml assembles the Space repo as:
#   Dockerfile, README.md, pluto-deployment-environment/, notebooks/*.jl
FROM julia:1.11.4

# Spaces run the container as uid 1000
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

EXPOSE 7860
CMD ["julia", "--project=pluto-deployment-environment", "-e", "import PlutoSliderServer; PlutoSliderServer.run_directory(\"notebooks\"; SliderServer_port=7860, SliderServer_host=\"0.0.0.0\")"]
