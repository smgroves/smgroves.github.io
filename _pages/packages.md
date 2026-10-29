---
layout: page
title: Tools
permalink: /packages/
description: "Packages and apps I've developed for researchers and data enthusiasts"
display_categories: [packages]
app_categories: [webapps]
horizontal: false
---

<!-- pages/packages.md -->
<div class="projects packages">
  <h2 class="category">Packages</h2>
{%- for category in page.display_categories %}
  {%- assign categorized_projects = site.projects | where: "category", category -%}
  {%- assign sorted_projects = categorized_projects | sort: "importance" %}
  {% if page.horizontal -%}
  <div class="container">
    <div class="row row-cols-2">
    {%- for project in sorted_projects -%}
      {% include projects_horizontal.html %}
    {%- endfor %}
    </div>
  </div>
  {%- else -%}
  <div class="grid">
    {%- for project in sorted_projects -%}
      {% include projects.html %}
    {%- endfor %}
  </div>
  {%- endif -%}
{% endfor %}
</div>

<!-- Apps: single-page tools that run in the browser -->
<div class="projects packages">
  <h2 class="category">Apps</h2>
  {%- for category in page.app_categories %}
  {%- assign sorted_apps = site.projects | where: "category", category | sort: "importance" %}
  <div class="grid">
    {%- for project in sorted_apps -%}
      {% include projects.html %}
    {%- endfor %}
  </div>
  {%- endfor %}
</div>
