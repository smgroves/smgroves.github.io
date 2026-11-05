# JupyterLite

Builds the in-browser Python notebooks served at https://smgroves.github.io/lite/.
Notebooks run on Pyodide (Python compiled to WebAssembly), so no server is needed.

The deploy workflow (`.github/workflows/deploy.yml`) builds this into `_site/lite`
before Jekyll runs; `_config.yml` lists `lite` under `keep_files` so Jekyll leaves it alone.

To add a notebook, put its path in `contents` in `jupyter_lite_config.json` and link it as
`/lite/notebooks/index.html?path=<name>.ipynb` (e.g. `lite_url` in `_data/notebooks.yml`).
Only packages available in Pyodide (or as pure-Python wheels) will import.

Local build:

    pip install -r jupyterlite/requirements.txt
    cd jupyterlite && jupyter lite build
