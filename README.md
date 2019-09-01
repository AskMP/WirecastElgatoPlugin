# WirecastElgatoPlugin
Wirecast has provided a plugin for the Elgato Stream Deck. The current version is in beta however is lacking in some usability and functionality. I have done some changes to provide the same functionality yet added some usability elements to it.
## Additions to the original
- Shot index is now using a number input
  - No longer restricting it to 12 locations
  - Minimal value is 0
  - Maximum value is 255 (limitation of the plugin using C++ int values?)
  - Can be incremented via keyboard arrows
- Shot buttons can now be moved to different locations without being reset to the default values
- Loading takes a lot less time when selecting a shot, 127.0.0.1 is 300ms faster than localhost
- Selecting a shot no longer flickers the default form before a websocket connection is made, it remains empty to prevent a visual bug
- Offloaded the shot settings to the Elgato application rather than relying on the plugin
- Changed attributes to use indexes rather than strings for things like mode
- Added future proofing changes for DOM control
## Known issues
- There is a flicker in the button graphic when dragging a button to a different location. This is due to the plugin defaulting to an incorrect previous value. The attributes are corrected shortly after however there is a visual bug
- There is currently no windows equivalent script to what I could build for MacOS but looking at the script files for the API, a future case for having the shot names available for a select box is possible
  - [return a list of shot names with their ID so it can be used to generate a select box option list]

## Wants
- An ability to have a shot name list per layer. Array of 5 arrays (the layers) that each of those contains the current shot names. Ideally, they would have the name and Wirecast shot ID for faster referencing.
