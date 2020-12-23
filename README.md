# Figurative

Figurative is a small library for producing HTML reports with figures representing multiple views into a shared data set. It includes example visualisations that use D3.js and a style in the vein of [the BBC R cookbook](https://bbc.github.io/rcookbook/) graphics. This is a specific solution with limited scope, but is one that I have found myself having to re-implement multiple times in the past.

See it in action in this [example page](https://jteutenberg.github.io/figurative/index.html).

## When is this applicable?
The typical use case for Figurative is when
* You are generating reports for a data set with known fields but unknown values
* The reports need to include multiple charts or figures
* All figures share selections: when data in one figure is selected, this is reflected in all other figures
* Your data sets contain around 20 to 20,000 items

## What does it offer?
Figurative is comprised of Javascript and CSS that provides
* Datastructures for maintaining shared selection state across multiple figures
* Automatic rescaling of fields, using standard metric units where possible
* A consistent report style based on BBC articles
* Functions for producing DOM components for figures consistent with this style
* Base implementations of standard charts using D3.js, again following the same style
* Ability to add figures and the basic charts declaratively
* Functions for partitioning a dataset into a new dataset that shares selections between partition and original datum

## Examples
The screenshots below are taken from the [example report](https://jteutenberg.github.io/figurative/index.html) for a data set based on asteroids in our solar system.

Figures, including legends and axis labels, are generated in HTML DOM and are styled by the CSS. The rendered plots, including axis values, are SVGs produced using D3.js.

## API

The [API](API.md) provides the valid properties for declaring each chart type, and for declaring figures containing one or more charts.
