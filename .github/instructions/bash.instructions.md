---
applyTo: "**/*.sh, **/*.bash"
description: General guide lines to write bash code.
---
# Bash Guide Lines

## Quick big rules

* All code goes in a function
* Always double quote variables
* Avoid global variables and declare them as `readonly`
* Always have a `main()` function for runnable scripts
* Always use `set -eo pipefail` : fail fast and be aware of exit codes
* Define functions as `myfunc() { ... }`, not `function myfun {...}`
* Always use `[[` instead of `[` or `test`
* Use `$( ... )` instead of backticks
* Prefer absolute paths and always qualify relative paths with `./.`
* Warnings and errors should go to `STDERR`, anything parsable should go to `STDOUT`
* Use `.sh` or `.bash` extension if file is meant to be included or sourced

## More specific rules with some example

### Global variables

* Avoid global vars
* Always UPPER_CASE naming
* Readonly declaration
* Globals that can be always use in any program :

```sh
readonly PROGNAME=$(basename $0)
readonly PROGDIR=$(readlink -m $(dirname $0))
readonly ARGS="$@"
```

### Other variables

* All variables should be local (they can only be used in functions)
* Always lowercase naming
* Self documenting parameters

```sh
fn_example() {
    local explicit_name = $1 ;
    local expName = $1 ;
}
```
* Usually use `i` for loop, so it is very important to declare it as local

### Main()

* Use always a `main()` function
* The only global command in the code is : `main` or `main "$@"`
* If script is also usable as library, call it using `[[ "$0" == "$BASH_SOURCE" ]] && main "$@"`


### Everything is a function

* Only the `main()` function and global declarations are run globaly
* Short code portion can be functions
* Define functions as `myfunc() { ... }`, not `function myfun {...}`


### Debugging

* Run with -x flag : `bash -x prog.sh`
* Debug just a small section of code using set -x and set +x
* Printing function name and its arguments `echo $FUNCNAME $@`

### Each line of code does just one thing

* Break expression with back slash `\`
* Use symbols at the start of the indented line

```sh
print_dir_if_not_empty() {
    local dir=$1
    is_empty $dir \
        && echo "dir is empty" \
        || echo "dir=$dir"
}
```


### Command line arguments


```sh
cmdline() {
    local arg=
    for arg
    do
        local delim=""
        case "$arg" in
            #translate --gnu-long-options to -g (short options)
            --config)         args="${args}-c ";;
            --pretend)        args="${args}-n ";;
            --test)           args="${args}-t ";;
            --help-config)    usage_config && exit 0;;
            --help)           args="${args}-h ";;
            --verbose)        args="${args}-v ";;
            --debug)          args="${args}-x ";;
            #pass through anything else
            *) [[ "${arg:0:1}" == "-" ]] || delim="\""
                args="${args}${delim}${arg}${delim} ";;
        esac
    done

    #Reset the positional parameters to the short options
    eval set -- $args

    while getopts "nvhxt:c:" OPTION
    do
         case $OPTION in
         v)
             readonly VERBOSE=1
             ;;
         h)
             usage
             exit 0
             ;;
         x)
             readonly DEBUG='-x'
             set -x
             ;;
         t)
             RUN_TESTS=$OPTARG
             verbose VINFO "Running tests"
             ;;
         c)
             readonly CONFIG_FILE=$OPTARG
             ;;
         n)
             readonly PRETEND=1
             ;;
        esac
    done

    if [[ $recursive_testing || -z $RUN_TESTS ]]; then
        [[ ! -f $CONFIG_FILE ]] \
            && eexit "You must provide --config file"
    fi
    return 0
}
```