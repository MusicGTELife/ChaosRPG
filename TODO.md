# Tasks to reach alpha status (0.1.0)

## General
- add logging utility functions
- alias JSON.stringify in the logging utility

### Architecture
- fix the export madness, it's getting to be too much to store in /dev/brain
- move library parts to /lib
- move application parts to /app
- seperate data tables into their own directory under /lib

### Testing
- ensure unit tests have at least 50% covereage of all functionality

### SecureRNG
- bounds checking of range offsets in getRandomInt
- basic floating point support in range 0-1 with N-bits of precision
- implement getSuffledArray in terms of SecureRNG, better yet implement it in
  terms of a SecureRNG sequence generator for a given range and or set of
  numeric values

## Mechanics
- implement a resolver system like `StatModified` and `StatResolver` to neatly
  handle combat
- selection of recently active players
- decide if item_sub_classes should be merged into a single list for ease of
  selection during monster/item generation

## Storage
- automatic resolution of storage slot when equipping items based upon the
  items sub class

## Units
- implement code to check if the unit can equip an item based upon the items
  stat requirements
- implement check if an item can be placed in an an equipment node based on
  the items type (gloves, boots) - DONE
- split off parts into an account schema

### Players

### Monsters
- implement basic monster tables
- implement basic generation of monsters

## Items

## Chat Interface


# Tasks to reach beta status (0.5.0)

## Stats
- add bounds checking of values against `StatTable` limits


# Tasks to reach beta feature freeze (0.8.0)
### Only accepting additional entries to the data tables at this point


# Tasks to reach gamma rc status (0.9.0)
### Only accepting bug fixes and minor balance tweaks to existing data table
    entries at this point


# Tasks to reach gamma status (1.0.0)
### Only accepting bug fixes
