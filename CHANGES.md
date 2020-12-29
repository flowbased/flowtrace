## 0.1.10 (2020-12-29)

* Fixed formatting of unserializable data packets

## 0.1.9 (2020-12-23)

* Added safety when adding non-serializable packets to a Flowtrace
* Fixed flowtrace-show command

## 0.1.8 (2020-12-03)

* TypeScript definitions no longer rely on the esModuleInterop parameter

## 0.1.7 (2020-12-03)

* Fixed EventEmitter typing in Flowtrace type defs

## 0.1.6 (2020-12-03)

* Flowtrace source code now uses JS Modules, with CommonJS version distributed in the package

## 0.1.5 (2020-12-03)

* This module now ships with basic TypeScript type definitions

## 0.1.4 (2020-12-03)

* Flowtrace helper now includes methods for logging `stdout` and process error events

## 0.1.3 (2020-11-24)

* Added a `clear` method to the Flowtracer for emptying the event buffer

## 0.1.2 (2020-11-11)

* Added a fbp-protocol recorder to create Flowtraces client-side (for example in the fbp-spec tool or Flowhub)

## 0.1.1 (2020-10-12)

* Data packets are now cloned to ensure they don't mutate later
* Some cleanup of dependencies

## 0.1.0 (2020-10-12)

* Ported from CoffeeScript tp modern ES6
* Added a Flowtrace base library to make capturing traces easier to runtimes
