---
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
</script>
