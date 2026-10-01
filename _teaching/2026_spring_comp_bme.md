---
layout: page
title: "BME2315: Computational Biomedical Engineering"
description: I was a Co-instructor for this course at UVA. 
img: assets/img/teaching/bme2315_2025/slope_field.png
importance: 3
category: 2026
semester: spring
institution: University of Virginia
---

Most of the course focuses on using numerical methods to approximate solutions to problems that cannot be solved analytically. Because these methods can be tedious, the computational power we have these days makes implementing the methods drastically easier. Therefore, the learning objectives for the course include understanding the mathematical basis for numerical methods across an array of problem types and implementing these methods computationally in Python. The course is organized into four modules, focused on different diseases: neurodegeneration (Alzheimer's), viral epidemics, fibrosis, and cancer. 

In each module, students work in pairs (rotating each module) on a project in a shared GitHub repository, and submit a final Jupyter Notebook report telling the story of their analysis. Students were encouraged to use generative AI as an aid, while documenting how they used it.

## Module 0: Introduction to Coding
- Introduction to Python [[Lecture]]({{ site.baseurl }}{% link assets/ppt/Intro to Python.pptx %}) [[Code]]({{ site.baseurl }}{% link assets/class_code/python_practice.py %})
- Introduction to GitHub [[Lecture]]({{ site.baseurl }}{% link assets/ppt/Intro to GitHub_Day2.pptx %}) [[GitHub reminders]]({{ site.baseurl }}{% link assets/ppt/github_reminders.pdf %}) [[Collaboration handout]]({{ site.baseurl }}{% link assets/pdf/bme2315_2026/student_collaboration_handout.pdf %})
- Introduction to Jupyter Notebooks [[Lecture]]({{ site.baseurl }}{% link assets/ppt/Intro to Jupyter Notebooks.pptx %}) [[good notebook example]]({{ site.baseurl }}{% link assets/class_code/high_quality_notebook.ipynb %}) [[bad notebook example]]({{ site.baseurl }}{% link assets/class_code/low_quality_notebook.ipynb %})

## Module 1: Neurodegeneration
Taught by Dr. Shayn Peirce-Cottler: using computation to manipulate, evaluate, and graph data sets, perform linear regressions, and draw conclusions from data.

## Module 2: Epidemic Modeling
Students acted as modeling consultants investigating a mystery viral outbreak on campus, receiving new data releases throughout the module. They fit SIR/SEIR models to the outbreak data, identified the likely virus family, and predicted the effects of public health interventions. [[GitHub repo]](https://github.com/smgroves/Module-2-Epidemics-SIR-Modeling) [[Repo setup guide]]({{ site.baseurl }}{% link assets/pdf/bme2315_2026/github_repo_fork_setup.pdf %})

- Module overview and announcements [[Lecture]]({{ site.baseurl }}{% link assets/ppt/bme2315_2026/m2_lecture0_announcements.pptx %})
- Lecture 1: Modeling the spread of viruses [[Lecture]]({{ site.baseurl }}{% link assets/ppt/bme2315_2026/m2_lecture1_viruses.pptx %}) [[Outbreak Day 1 brief]]({{ site.baseurl }}{% link assets/pdf/bme2315_2026/outbreak_day1_notice.pdf %})
    - Activity: The Immune System Game [[Slides]]({{ site.baseurl }}{% link assets/ppt/bme2315_2026/m2_immune_game.pptx %}) [[Cell type cards]]({{ site.baseurl }}{% link assets/pdf/bme2315_2026/immune_game_cell_cards.pdf %})
    - Interactive: [Viral disease transmissibility vs. severity]({{ site.baseurl }}{% link assets/html/bme2315_2026/viruses.html %})
- Lecture 2: Epidemics and the SIR model [[Lecture]]({{ site.baseurl }}{% link assets/ppt/bme2315_2026/m2_lecture2_SIR.pptx %})
- Lecture 3: Euler's method and fitting the SEIR model [[Lecture]]({{ site.baseurl }}{% link assets/ppt/bme2315_2026/m2_lecture3_euler.pptx %})
    - Interactive: [SEIR 3-parameter grid search]({{ site.baseurl }}{% link assets/html/bme2315_2026/seir_grid_search.html %})
    - Optimization activity [[Code]]({{ site.baseurl }}{% link assets/class_code/bme2315_2026/optimization_drug_example.py %})
- Lecture 4: Calculating error and predicting the effect of interventions [[Lecture]]({{ site.baseurl }}{% link assets/ppt/bme2315_2026/m2_lecture4_interventions.pptx %})
- Lecture 5: More accurate ODE solvers (Midpoint and Runge-Kutta methods) [[Lecture]]({{ site.baseurl }}{% link assets/ppt/bme2315_2026/m2_lecture5_runge_kutta.pptx %})
- Module 2 recap and transition to Module 3 [[Slides]]({{ site.baseurl }}{% link assets/ppt/bme2315_2026/m2_m3_transition.pptx %})

## Module 3: Fibrosis
Using computation to organize, quantify, and evaluate lung fibrosis images across spatial scales, using interpolation and optimization. [[GitHub repo]](https://github.com/smgroves/Module-3-Fibrosis)

## Module 4: Cancer Machine Learning
Using machine learning on high-dimensional RNA sequencing data (TCGA) to understand disease mechanisms through the hallmarks of cancer. [[GitHub repo]](https://github.com/smgroves/Module-4-Cancer)

- Lecture 1: Introduction to cancer [[Lecture]]({{ site.baseurl }}{% link assets/ppt/bme2315_2026/m4_lecture1.pptx %})
    - Interactive: [Typing test: what if you were copying the genome?]({{ site.baseurl }}{% link assets/html/bme2315_2026/typing_test.html %})
    - Interactive: [Hallmarks of cancer map]({{ site.baseurl }}{% link assets/html/bme2315_2026/hallmarks_map.html %}) [[Hallmark rules]]({{ site.baseurl }}{% link assets/pdf/bme2315_2026/hallmark_rules_quick.pdf %})
    - Interactive: [Cancer hallmarks agent-based model]({{ site.baseurl }}{% link assets/html/bme2315_2026/cancer_hallmarks_abm.html %}) [[Advanced version]]({{ site.baseurl }}{% link assets/html/bme2315_2026/cancer_hallmarks_advanced_abm.html %}) [[Python version]]({{ site.baseurl }}{% link assets/class_code/bme2315_2026/abm_hallmarks.py %})
- Lecture 2: Introduction to RNA sequencing data [[Lecture]]({{ site.baseurl }}{% link assets/ppt/bme2315_2026/m4_lecture2.pptx %})
- Lecture 3: Unsupervised learning: dimensionality reduction (PCA, UMAP) [[Lecture]]({{ site.baseurl }}{% link assets/ppt/bme2315_2026/m4_lecture3.pptx %})
- Lecture 4: Clustering and a preview of supervised learning [[Lecture]]({{ site.baseurl }}{% link assets/ppt/bme2315_2026/m4_lecture4.pptx %}) [[PCA & clustering activity]]({{ site.baseurl }}{% link assets/pdf/bme2315_2026/pca_clustering_activity.pdf %})
- Lecture 5: Supervised learning: regression, gradient descent, logistic regression, and decision trees [[Lecture]]({{ site.baseurl }}{% link assets/ppt/bme2315_2026/m4_lecture5.pptx %}) [[Gini coefficient activity]]({{ site.baseurl }}{% link assets/pdf/bme2315_2026/gini_decision_trees_activity.pdf %})
- Lecture 6: What makes a good ML model? Model scoring and validation [[Lecture]]({{ site.baseurl }}{% link assets/ppt/bme2315_2026/m4_lecture6.pptx %}) [[In-class work]]({{ site.baseurl }}{% link assets/ppt/bme2315_2026/m4_lecture6_in_class_work.pptx %})
- Lecture 7: How do I make my ML model better? Overfitting and regularization [[Lecture]]({{ site.baseurl }}{% link assets/ppt/bme2315_2026/m4_lecture7.pptx %})
