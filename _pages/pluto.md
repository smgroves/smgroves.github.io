---
layout: page
title: Interactive Notebooks
permalink: /pluto/
---

<p>Below are live, interactive Pluto notebooks hosted on Render:</p>

<ul id="pluto-notebooks">
  <li>Loading notebook list...</li>
</ul>

<script>
fetch("https://smgroves-github-io.onrender.com/")
  .then(res => res.text())
  .then(html => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const links = Array.from(doc.querySelectorAll("a")).filter(a => a.href.includes("/notebook/"));

    const list = document.getElementById("pluto-notebooks");
    list.innerHTML = ""; // clear loading message

    for (const link of links) {
      const item = document.createElement("li");
      item.innerHTML = `<a href="${link.href}" target="_blank">${link.textContent}</a>`;
      list.appendChild(item);
    }
  })
  .catch(err => {
    document.getElementById("pluto-notebooks").innerHTML = "<li>Failed to load notebooks.</li>";
    console.error(err);
  });
</script>
