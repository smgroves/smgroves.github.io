---
layout: page
title: Interactive Notebooks
permalink: /notebooks/
---

<p>Explore live Pluto notebooks hosted on Railway:</p>

<label for="tag-filter">Filter by tag:</label>
<select id="tag-filter">
  <option value="">All tags</option>
</select>

<br><br>

<label for="search-input">Search:</label>
<input type="text" id="search-input" placeholder="Type to search..." />

<div id="pluto-catalogue">
  <p>Loading notebooks...</p>
</div>

<script>
const meta = {{ site.data.notebooks | jsonify }};
const BASE_URL = "https://pluto-slider-server-production.up.railway.app/";

function buildList(filterTag = "", searchTerm = "") {
  const container = document.getElementById("pluto-catalogue");
  container.innerHTML = "";

  Object.entries(meta).forEach(([key, data]) => {
    const title = data.title || key;
    const desc = data.description || "";
    const tags = data.tags || [];

    const matchesTag = !filterTag || tags.includes(filterTag);
    const matchesSearch = title.toLowerCase().includes(searchTerm) || desc.toLowerCase().includes(searchTerm);

    if (matchesTag && matchesSearch) {
      const item = document.createElement("div");
      item.style.marginBottom = "1.5em";
      item.innerHTML = `
        <h3><a href="${BASE_URL + key}.html" target="_blank">${title}</a></h3>
        <p>${desc}</p>
        ${tags.length ? `<p style="font-size: 0.9em; color: #555;">Tags: ${tags.join(", ")}</p>` : ""}
      `;
      container.appendChild(item);
    }
  });
}

function populateTagDropdown() {
  const tagSet = new Set();
  Object.values(meta).forEach(n => (n.tags || []).forEach(tag => tagSet.add(tag)));

  const tagFilter = document.getElementById("tag-filter");
  tagSet.forEach(tag => {
    const opt = document.createElement("option");
    opt.value = tag;
    opt.textContent = tag;
    tagFilter.appendChild(opt);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search-input");
  const tagFilter = document.getElementById("tag-filter");

  populateTagDropdown();
  buildList();

  searchInput.addEventListener("input", () => {
    buildList(tagFilter.value, searchInput.value.toLowerCase());
  });

  tagFilter.addEventListener("change", () => {
    buildList(tagFilter.value, searchInput.value.toLowerCase());
  });
});
</script>

<!-- ---
layout: page
title: Interactive Notebooks
permalink: /notebooks/
---

<p>Below are live, interactive Pluto notebooks hosted on Railway:</p>

<ul id="pluto-notebooks">
  <li>Loading notebook list...</li>
</ul>

<script>
fetch("https://pluto-slider-server-production.up.railway.app/")
  .then(res => res.text())
  .then(html => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const links = Array.from(doc.querySelectorAll("a"))
      .filter(a =>
        a.getAttribute("href").endsWith(".html") &&
        !a.getAttribute("href").includes("index.html")
      );

    const list = document.getElementById("pluto-notebooks");
    list.innerHTML = ""; // clear loading message

    for (const link of links) {
      const url = new URL(link.getAttribute("href"), "https://pluto-slider-server-production.up.railway.app/");
      const label = decodeURIComponent(url.pathname.split("/").pop().replace(".html", ""));
      const pretty = label.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase());

      const item = document.createElement("li");
      item.innerHTML = `<a href="${url.href}" target="_blank">${pretty}</a>`;
      list.appendChild(item);
    }
  })
  .catch(err => {
    document.getElementById("pluto-notebooks").innerHTML = "<li>Failed to load notebooks.</li>";
    console.error(err);
  });
</script> -->