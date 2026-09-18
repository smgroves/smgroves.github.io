---
layout: default
title: announcements
permalink: /announcements/
description: "[Placeholder: intro blurb for the announcements page]"
---

<div class="post">

  <div class="header-bar">
    <h1>Announcements</h1>
    <h2>[Placeholder: short intro — quick updates, talks, and news, separate from the full blog posts]</h2>
  </div>

  {%- assign announcements = site.posts | where: "inline", true | sort: "date" | reverse -%}
  <ul class="post-list">
    {% for post in announcements %}
    <li class="post-inline">
      <p class="post-meta">{{ post.date | date: '%B %-d, %Y' }}</p>
      <p>{{ post.content | remove: '<p>' | remove: '</p>' | emojify }}</p>
    </li>
    {% endfor %}
  </ul>

</div>
