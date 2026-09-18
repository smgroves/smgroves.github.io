---
layout: page
title: packages
permalink: /packages/
description: "[Placeholder: intro blurb about the packages you maintain and who they're for]"
display_categories: [packages]
horizontal: false
---

<!-- pages/packages.md -->
<div class="projects">
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
