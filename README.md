# retro RPG template

This project is meant to help you with ideas for setting up a retro RPG in [node-raylib](https://github.com/RobLoach/node-raylib), in the style of Final Fantasy 4/5, Pokemon, or Zelda. It's intent is to be extremely asset-driven, so you should be able to make a game with very little code changes (just edit your assets.)

<img width="432" height="384" alt="screenshot" src="https://github.com/user-attachments/assets/50b21ef2-aae7-457e-950c-f0a14b182d73" />

## Features

- dialog-flows that can be easily edited in markdown (via [mdif](https://github.com/notnullgames/mdif))
- simple mapping in [Tiled](https://www.mapeditor.org/)
- normalized characters (easier NPC & player modification with spritesheets) that you can edit graphically [here](https://notnullgames.github.io/universal-sprites/)

## Usage

```sh
npm i
npm start
```

Essentially, edit [game.md](assets/game.md) to setup the dialog, and edit the map (in [Tiled](https://www.mapeditor.org/)) to create your game.

See `player` and `sign` in Tiled, to see how to link up objects, and those behaviors are in [objects/](src/objects/)
