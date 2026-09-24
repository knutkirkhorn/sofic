# sofic

> Check the source files in directories

Sofic: **So**urce **fi**le **c**hecker.

## Installation

```sh
npm install --global sofic
```

## Development

```sh
bun cli.ts check
```

## Usage

```
$ sofic --help

  Usage
    $ sofic
    $ sofic add <tool>
    $ sofic check <path>
    $ sofic init <tool>

  Options
    --default, -d  Use the default config for every tool (init only)

  Examples
    $ sofic
    $ sofic add eslint
    $ sofic add --list
    $ sofic init bun
    $ sofic init bun --default
    $ sofic check C:\Users\knut\dev\sofic
    $ sofic check C:\Users\knut\dev
```
