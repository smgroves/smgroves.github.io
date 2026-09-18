---
layout: page
title: projects
permalink: /projects/
description: "[Placeholder: intro blurb for the research/fun projects page]"
nav: true
nav_order: 3
nav_title: Research
dropdown: true
children:
  - title: Projects
    permalink: /projects/
  - title: Packages
    permalink: /packages/
display_categories: [research, service, fun]
---

<!-- pages/projects.md -->
<div class="projects">
  {%- for category in page.display_categories %}
  <h2 class="category">{{ category | capitalize }}</h2>
  {%- assign sorted_projects = site.projects | where: "category", category | sort: "importance" %}
  <ul class="project-list">
    {%- for project in sorted_projects %}
    <li class="project-list-item">
      <h3>
        {%- if project.redirect %}
        <a href="{{ project.redirect }}">{{ project.title }}</a>
        {%- else %}
        <a href="{{ project.url | relative_url }}">{{ project.title }}</a>
        {%- endif %}
      </h3>
      <p>{{ project.description }}</p>
    </li>
    {%- endfor %}
  </ul>
  {% endfor %}
</div>
