# Example Applications

To run these example applications, you can just do the one-liner:

```shell
npx quack examples
```

Either from the root of this repository, or passing it this folder as a parameter.  

You can still build these from their folder one at a time and the harness
index.html will just work.  If you add a project to this in the subfolder
and it can be built into a web app with a dist/index.html the harness will
pick up the new example next time it's run.

--

These applications exercise the library from very basic to complex.

## The Basics

These forms are meant to provide simple configuration-based test
suites for the framework.

### Simple Form

The most basic example.  A small one file form with some basic math
and inputs.  No styling, no jquery just a very basic manifest.

### Simple Table

A simple example of a tabular form.  Loads up some data about fruit
and shows a few columns.  Single file, all configuration.

### Simple Table from Object

A simple example of a tabular form pulling rows from a plain old
javascript object as opposed to an array.  Single file, all
configuration.

### Complex Table

A more complex tabular form example that uses the fruit data again
and performs mathematical solves across each row, and aggregation
functions down.  Single file, all configuration, no code.

### Section Visibility

A regression harness for solver-driven section and group visibility. Renaming
a product re-renders every table whose columns are generated from it; the hide
class lives on an element that render regenerates, so it used to be dropped.
Single file, all configuration.

## Advanced

### Postcard

A silly mock startup example with a form and other views to toggle
between.  Multiple forms sections, shows an example of creating a
theme.

### Gradebook

A full fledged application built in the framework, using the tools 
as intended by design.  Multiple grids, math and data persistence
in the browser.

## Cheat List of Examples for Scripting and Joy

```
complex_table
gradebook
manifest_testbed
manyfest_editor
postcard_example
section_visibility
simple_form
simple_table
simple_table_from_object
```
