---
layout: default
title: announcements
permalink: /announcements/
description: "Quick announcements about what I've been working on, presenting, and publishing."
---

<div class="post">

  <div class="header-bar">
    <h1>Announcements</h1>
    <h2>Quick updates and news about what I've been working on, presenting, and publishing.</h2>
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
