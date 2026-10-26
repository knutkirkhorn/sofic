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
    --default, -d  Use the default config instead of prompting (add/init/check --fix)
    --fix          Add missing configs found by check

  Examples
    $ sofic
    $ sofic add eslint
    $ sofic add eslint --default
    $ sofic add --list
    $ sofic init bun
    $ sofic init bun --default
    $ sofic check C:\Users\knut\dev\sofic
    $ sofic check C:\Users\knut\dev
    $ sofic check --fix
    $ sofic check C:\Users\knut\dev --fix --default
```
