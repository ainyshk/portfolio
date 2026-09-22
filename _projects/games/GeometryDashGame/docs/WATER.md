---
layout: post
title: Adventure Game - Sample Level Documentation
description: Example of how to document a level while building a team foo project
category: Foo
breadcrumb: true
permalink: /foo/gamelevelwater
---

## Why Document Your Work

Teams often remember what they built, but forget the exact steps, files, tests, and decisions that got them there.
This page is a sample of the kind of project documentation your team should create while working.

Keep documentation lightweight and useful:

- What did we change?
- Why did we change it?
- What files did we touch?
- How did we test it?
- What should happen next?

## Sample Focus: GameLevelWater

This sample uses `GameLevelWater.js` because it already has a clear theme, background, player, and NPC/enemy setup.

## Example Documentation Entry

### Goal

Build a water-themed level that teaches students how a level is assembled from background, player, NPC, and enemy objects.

### Files Added 

- `_projects/foo/levels/GameLevelWater.js`
- `_projects/foo/images/water/deepseadungeon.jpeg`
- `_projects/foo/images/water/octopus.png`
- `_projects/foo/images/water/shark.png`

### What We Implemented

- Added a water background using `GameEnvBackground`
- Configured Octopus as the main player
- Added Shark as an enemy object
- Added NPC interactions and movement setup
- Kept all assets inside the `_projects/foo` structure

### How We Tested

- Ran `make dev`
- Opened the local site and loaded the foo project
- Checked that the background loaded correctly
- Verified the player sprite rendered and moved
- Confirmed enemy/NPC objects appeared in the level

### What We Learned

- A level is easier to maintain when assets and code stay grouped by project
- Small notes during development save time later when making videos or writing summaries
- Documentation is part of teamwork, not extra work

### Next Step

Document the next level or feature update using the same pattern.

## Reusable Team Template

Copy this structure into your own project notes:

```markdown
## Goal

## Files Changed

## What We Implemented

## How We Tested

## What We Learned

## Next Step
```

## When To Write This

Write short updates when:

- you finish a feature
- you change level logic
- you add or replace images
- you prepare formative or summative evidence
- your team needs a record of what happened during a work session
