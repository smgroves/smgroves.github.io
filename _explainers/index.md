---
layout: default
title: Visual Explainers
permalink: /explainers/
agination:
  enabled: true
  collection: posts
  permalink: /page/:num/
  per_page: 5
  sort_field: date
  sort_reverse: true
  trail:
    before: 1 # The number of links before the current page
    after: 3  # The number of links after the current page
---

# All Explainers
Here are all the explainer articles:

<ul>
  {% for explainer in site.explainers %}
    <li><a href="{{ explainer.url }}">{{ explainer.title }}</a></li>
  {% endfor %}
</ul>