---
layout: page
title: Interactive Notebooks
permalink: /notebooks/
---

<style>
.btn-group .btn-outline-primary.type-toggle.active {
  background-color: #007bff !important;
  color: white !important;
  border-color: #007bff !important;
}
.btn-group .btn-outline-secondary.type-toggle.active {
  background-color: rgb(148, 100, 188) !important;
  color: white !important;
  border-color: rgb(148, 100, 188) !important;
}
</style>

<p><strong>Explore Pluto and Jupyter notebooks</strong>, both live and static:</p>

<!-- Type Filter Pills -->
<div class="btn-group mb-3" role="group" aria-label="Type filter">
  <button type="button" class="btn btn-outline-primary active type-toggle" data-type="interactive">Interactive</button>
  <button type="button" class="btn btn-outline-primary active type-toggle" data-type="static">Static</button>
</div>

<!-- Tag Filter -->
<label for="tag-filter">Filter by tag:</label>
<select id="tag-filter" class="form-control mb-3" style="max-width: 300px;">
  <option value="">All tags</option>
</select>

<!-- Search Bar -->
<label for="search-input">Search:</label>
<input type="text" id="search-input" class="form-control mb-4" placeholder="Type to search..." style="max-width: 400px;" />

<!-- Notebook List -->
<div id="notebook-list">
  <p>Loading notebooks...</p>
</div>

<script>
const metadata = {{ site.data.notebooks | jsonify }};
const INTERACTIVE_BASE = "https://pluto-slider-server-production.up.railway.app/";
const STATIC_BASE = "https://smgroves.github.io/julia/";

let allNotebooks = [];
function normalizeMeta() {
  allNotebooks = Object.entries(metadata).map(([key, data]) => {
    const type = data.type || (key.includes("interactive") ? "interactive" : "static");
    const dateStr = data.date || "2000-01-01"; // fallback for undated entries

    return {
      key,
      title: data.title || key,
      description: data.description || "",
      tags: data.tags || [],
      type,
      date: new Date(dateStr),
      url: data.url || (type === "interactive"
        ? `https://pluto-slider-server-production.up.railway.app/${key}.html`
        : data.static_url || `https://smgroves.github.io/julia/${key}.html`),
      binder_url: data.binder_url || null
    };
  });

  // Sort newest to oldest
  allNotebooks.sort((a, b) => b.date - a.date);
}

function buildTagDropdown() {
  const tagSet = new Set();
  allNotebooks.forEach(n => (n.tags || []).forEach(tag => tagSet.add(tag)));

  const tagSelect = document.getElementById("tag-filter");
  tagSet.forEach(tag => {
    const opt = document.createElement("option");
    opt.value = tag;
    opt.textContent = tag;
    tagSelect.appendChild(opt);
  });
}

function renderList() {
  const container = document.getElementById("notebook-list");
  const searchTerm = document.getElementById("search-input").value.toLowerCase();
  const selectedTag = document.getElementById("tag-filter").value;
  const activeTypes = Array.from(document.querySelectorAll(".btn-group .btn.active")).map(btn => btn.dataset.type);
  const filtered = allNotebooks.filter(n => {
    const matchesType = activeTypes.includes(n.type);
    const matchesTag = !selectedTag || n.tags.includes(selectedTag);
    const matchesSearch = n.title.toLowerCase().includes(searchTerm) || n.description.toLowerCase().includes(searchTerm);
    return matchesType && matchesTag && matchesSearch;
  });

  container.innerHTML = filtered.length
    ? ""
    : "<p>No notebooks match your filters.</p>";

  filtered.forEach(n => {
    const item = document.createElement("div");
    item.className = "mb-4";

    const badgeClass = n.type === "interactive" ? "primary" : "secondary";
    const binderBtn = n.binder_url
      ? `<a href="${n.binder_url}" class="btn btn-sm btn-outline-secondary ml-2" target="_blank">Launch in Binder</a>`
      : "";
    const formattedDate = n.date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
        });
    item.innerHTML = `
      <h4>
        <a href="${n.url}" target="_blank">${n.title}</a>
        ${binderBtn}
        <span class="badge badge-${badgeClass} ml-2">${n.type}</span>
      </h4>
      <p>${n.description}</p>
      <p style="font-size: 0.9em; color: #555;">
        ${n.tags.length ? `Tags: ${n.tags.join(", ")}` : ""}
        ${n.date ? ` &nbsp; • &nbsp; ${formattedDate}` : ""}
      </p>
    `;
    container.appendChild(item);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  normalizeMeta();
  buildTagDropdown();
  renderList();

  document.getElementById("search-input").addEventListener("input", renderList);
  document.getElementById("tag-filter").addEventListener("change", renderList);

  document.querySelectorAll(".btn-group .btn").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      renderList();
    });
  });
});
</script>
