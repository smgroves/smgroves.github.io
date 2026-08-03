---
layout: page
permalink: /teaching/
title: teaching
description: Materials for courses I've taught. 
nav: true
nav_order: 5
horizontal: false
institutions: [University of Virginia, Vanderbilt University, College of William & Mary]

---
<div class="projects teaching">
{%- for institution in page.institutions %}
  {%- assign institution_projects = site.teaching | where: "institution", institution -%}
  {%- if institution_projects.size > 0 %}
  <h2 class="institution">{{ institution }}</h2>
  {%- assign years = institution_projects | map: "category" | uniq | sort | reverse -%}
  {%- for year in years %}
  <h2 class="category">{{ year }}</h2>
  {%- assign year_projects = institution_projects | where: "category", year -%}
  {%- assign spring_projects = year_projects | where: "semester", "spring" | sort: "importance" -%}
  {%- assign fall_projects = year_projects | where: "semester", "fall" | sort: "importance" -%}
  {%- if spring_projects.size > 0 or fall_projects.size > 0 %}
    {%- if spring_projects.size > 0 %}
    <h3 class="semester">Spring</h3>
    <div class="grid">
      {%- for project in spring_projects -%}
        {% include projects.html %}
      {%- endfor %}
    </div>
    {%- endif %}
    {%- if fall_projects.size > 0 %}
    <h3 class="semester">Fall</h3>
    <div class="grid">
      {%- for project in fall_projects -%}
        {% include projects.html %}
      {%- endfor %}
    </div>
    {%- endif %}
  {%- else %}
    {%- assign sorted_projects = year_projects | sort: "importance" -%}
    <div class="grid">
      {%- for project in sorted_projects -%}
        {% include projects.html %}
      {%- endfor %}
    </div>
  {%- endif %}
  {%- endfor %}
  {%- endif %}
{%- endfor %}
</div>
