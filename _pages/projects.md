---
layout: page
title: projects
permalink: /projects/
description: "A collection of projects I've worked on and things I'm currently working on. If you are interested in working with me, please reach out!"
nav: true
nav_order: 3
nav_title: Research
dropdown: true
children:
  - title: Projects
    permalink: /projects/
  - title: Packages
    permalink: /packages/
display_sections: [active, past]
---

<!-- pages/projects.md -->
<!--
  Each project in _projects/ is shown here as a blurb, grouped into active and
  past sections and sorted by `importance`. Front matter fields:
    status: active or past (which section it appears in)
    blurb:  the paragraph shown on this page (markdown allowed)
    papers: list of bib keys from _bibliography/papers.bib, listed below the blurb
    links:  optional list of {text, url} links shown below the blurb
  Fun projects also get a "Read more" link to their own page in _projects/
  (this ignores `redirect`).
-->
<div class="projects">
  {%- for section in page.display_sections %}
  <h2 class="project-section">{{ section }}</h2>
  {%- assign sorted_projects = site.projects | where: "status", section | sort: "importance" %}
  {%- for project in sorted_projects %}
  <div class="project-blurb">
    <h3>{{ project.title }}</h3>
    {%- if project.img %}
    <img class="project-img rounded z-depth-1" src="{{ project.img | relative_url }}" alt="{{ project.title }}">
    {%- endif %}
    {{ project.blurb | default: project.description | markdownify }}

    {%- if project.links or project.category == "fun" %}
    <p class="project-links">
      {%- for link in project.links %}
      <a href="{{ link.url }}">{{ link.text }}</a>{% unless forloop.last %} &middot; {% endunless %}
      {%- endfor %}
      {%- if project.category == "fun" %}
      {%- if project.links %} &middot; {% endif %}
      <a href="{{ project.url | relative_url }}">Read more &rarr;</a>
      {%- endif %}
    </p>
    {%- endif %}

    {%- if project.papers %}
    <div class="project-papers">
      <h4>Related papers</h4>
      {%- for key in project.papers %}
      {% bibliography -f papers -q @*[key={{ key }}]* -T bib_simple %}
      {%- endfor %}
    </div>
    {%- endif %}
  </div>
  {%- endfor %}
  {% endfor %}
</div>
