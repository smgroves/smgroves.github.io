# smgroves.github.io

Sarah Groves's academic site (Jekyll, al-folio-based), live at https://smgroves.github.io. Branch `master`.
She is an instructor/researcher at UVA (smgroves@virginia.edu); the site hosts research, teaching pages, course materials, interactive notebooks and a teaching wiki.

## Git rules (important)
- Commit and push ONLY when Sarah explicitly asks. Preview locally first; she often iterates and reverses.
- Stage specific paths, never `git add -A`. Other Claude sessions and Sarah herself often have uncommitted work in this repo at the same time; leave files you didn't touch alone, and re-read a file before editing if another session may have changed it.
- When committing, say what is and isn't included. Flag any commit on origin you didn't make.
- Never commit answer keys, instructor-only material, or anything with student names/emails (e.g. syllabi with TA emails).

## Site structure
- `_pages/` — top-level pages: `about.md` (home), `projects.md`, `packages.md` (shown as "Tools"), `publications.md`, `teaching.md`, `announcements.md`, `notebooks.md` (/notebooks/), `cv.md` (not in nav), `series/booleabayes.md` ("GRN Inference" series), `teaching-wiki/`, `setup-guide/`, `kahoots/`, `codebreak/`.
- Nav is hardcoded in `_includes/header.html` (Writing and Research dropdowns; optional `tag:` field renders a pill, e.g. "Series").
- `_projects/*.md` — one file per project. Front matter: `status: active|past`, `importance`, `category`, `img`, `blurb:` (markdown), `links:`, `papers:` (DOIs of related papers). Projects page groups ACTIVE / PAST; each heading is `<h3 id="{{ project.slug | slugify }}">`, so anchors = filename slug (e.g. `/projects/#sclc`, `/projects/#omics-tools`). Several blurbs still have `# TODO` placeholders.
- `_teaching/*.md` — course pages, named `YYYY_term_course.md`, front matter carries institution/semester tags. Teaching page groups by institution, year on one line, Fall above Spring.
- `_posts/` — blog AND announcements (old `_news/` was merged in). Posts with `inline: true` are announcements. Filenames must be `YYYY-MM-DD-title.md` or they silently don't publish. Home page shows 3 latest (`news_limit: 3`).
- `_bibliography/papers.bib` — jekyll-scholar. `_layouts/bib.html` (Dimensions badge, "Abstract" button, bioRxiv entries gray), `_layouts/bib_simple.html` (small list on Projects). Use real DOIs/verbatim abstracts only; never invent citation data.
- `_data/notebooks.yml` — entries for /notebooks/. `_sass/_base.scss` — most custom styling. `_includes/head.html` — fonts.
- Course materials are COPIED into `assets/{ppt,pdf,html,class_code,img/teaching}/<course>_<year>/` (e.g. `ds5030_2026`, `bme2315_2026`, `assets/pdf/csb/`) so the site never depends on Box paths. Use clean filenames (no spaces).
- Standalone HTML apps/pages: `apps/network-explorer/`, `teaching/ds5030/roadmap/` (`ds5030/roadmap/` is just a redirect), `understanding-uncertainty/` (short link), `ds5030-uncertainty-plots/` (redirect to the Week 7 quiz in `assets/html/ds5030_2026/Week07/`).
- `unused/` is excluded from the build.

## Courses
- DS5030 Understanding Uncertainty (Fall 2026): `_teaching/2026_fall_ds5030.md`. Sources: Box `_Teaching/DS5030_Understanding_Uncertainty/student_repo_setup/UU_F26_templates/` (its own public repo) and `.../Understanding Uncertainty/claude_things/` (interactives). Never make the parent Box folder a repo. Item labels are bold (`**Pre-Class Video:**`, `**Pre-Class (Optional):**`, `**Lecture:**`, `**Problem Set N:**`, `**Lab NN:**`, `**Pre-Lab Bridge:**` for Thursday notebooks, `**Interactive:**`); pre-class items first each week. Don't link quizzes or decks containing answers. Datasets aren't copied; link the template repo. Commit only DS5030 files.
- DS2003 Communicating with Data (Fall 2026) is NOT in this repo: `_teaching/2026_fall_ds2003.md` just redirects to https://smgroves.github.io/DS2003/, built from the separate repo in Box `_Teaching/DS2003_Communicating_with_data/F26_DS2003_02`. The `ds2003-preview` launch config serves it on :8765.
- BME2315 Computational BME (Spring 2025/2026): `_teaching/2026_spring_comp_bme.md`. Don't post co-instructors' slides (Shayn, Lavie) without their agreement.
- Course page style: plain ordered schedule with `[[Slides]]`/`[[Lecture]]` links via `{{ site.baseurl }}{% link assets/... %}`. Slides as PDF, not pptx.

## Local build / preview
- Use the `.claude/launch.json` config `jekyll-dev` (preview_start), which runs `bundle exec jekyll serve --host 0.0.0.0 --port 4000` with Homebrew Ruby on PATH (`/opt/homebrew/opt/ruby/bin`, Ruby 4.0, bundler 4.0.16) and `LANG/LC_ALL=en_US.UTF-8`. Gems install to `vendor/bundle` (`.bundle/config`).
- Port 4000 may already be in use by another session's server; reuse it.
- ImageMagick warnings during build are harmless.
- `ds5030-assets` launch config serves `assets/html/ds5030_2026` statically on :8766 for testing interactives.
- `{% link %}` fails the build if the target file doesn't exist; only link files that are present.
- After building, check links on changed pages actually return 200.
- PPTX/DOCX to PDF: `soffice --headless --convert-to pdf` (LibreOffice installed); compress big PDFs with `gs`.

## Deployment
- Push to `master` triggers `.github/workflows/deploy.yml`, which builds with `bin/deploy` and publishes to the `gh-pages` branch. `deploy-image.yml`/`deploy-docker-tag.yml` are al-folio Docker workflows (not used for the site).
- Known issue: responsive `<picture>` webp variants are not generated in the CI build, causing intermittent image fallback on the live site.
- Card grids use CSS flex (masonry disabled: `enable_masonry: false`); images use `object-fit: contain`, uncropped. `_includes/figure.html` fallback is vanilla JS (no jQuery).

## Interactive notebooks (/notebooks/)
- Static Jupyter notebooks in `jupyter/` and course notebooks: link via `https://nbviewer.org/urls/smgroves.github.io/<path>.ipynb` plus a separate `[.ipynb]` download link. Do NOT use nbviewer's `/github/...` form (GitHub API rate limit). Notebook images must use absolute smgroves.github.io URLs.
- Pluto notebooks in `julia/*.jl` need a live PlutoSliderServer (env in `pluto-deployment-environment/`, PlutoSliderServer 1.3.0, Julia 1.11.4). `_pages/notebooks.md` reads `pluto_server_url` from `_config.yml` (currently `https://smgroves-pluto-notebooks.hf.space`, which does not exist).
- As of 2026-10-26 the Pluto sliders are DEAD: Railway/Fly (`fly.toml`, `Dockerfile.pluto`)/Render (`render.yaml`) hosts are gone; `hf-space/` + `.github/workflows/pluto-space.yml` target an HF Docker Space, but free HF accounts can't create Docker Spaces. Workflow fails until a host is chosen (Cloud Run recommended). Sarah wants a live server, not a static export. Claude can't create cloud accounts; give her step-by-step instructions for those steps.
- `jupyter/data/*.tif` are gitignored, so `elevation.ipynb` can't fully run on Binder.

## Teaching wiki (`_pages/teaching-wiki/index.html`, /teaching-wiki)
- One large single-file page (~5000 lines): sidebar nav, pages toggled with `show(id)`.
- Glossary terms: `<span class="w-gloss">` (dotted underline) open a definition panel BELOW the paragraph (pushes content down, never an overlay); reuse an existing glossary entry for recurring terms. Cross-page links: `.w-xref` (solid underline) using `show(id)`.
- Voice: evidence-based, provenance-tagged claims; flag weak sources (e.g. non-meta-analytic effect sizes, unpublished theses). Key Literature page holds references. Escape raw `<` in HTML. Bump the home page "last updated" date when editing.
- Quick test without Jekyll: strip front matter into a scratch copy and serve with `python3 -m http.server`; check console for errors.

## Style preferences
- Plain instructor voice; avoid "Claude-looking" design (cream/terracotta, pill badges, small all-caps labels, card grids for text).
- Tidy, concise pages. Fonts: Lora (headings) / Lato (body). Theme purple used for section headings (uppercase, underline); last name "Groves" bold.
- Uniform tiles/thumbnails, titles that don't wrap mid-word, consistent headings across Projects and Teaching. Don't alter the BoBa-T image.
- Prefer using available local files over blocking on missing ones; show options when design is uncertain.

## Gotchas
- Jekyll `exclude:` in `_config.yml` replaces defaults: root files like `README.md`, `fly.toml`, `start.sh` get copied into `_site`. Check before adding root files.
- Box sync can delete or alter files (e.g. `.gitignore` in course repos); check `git status` for surprises.
