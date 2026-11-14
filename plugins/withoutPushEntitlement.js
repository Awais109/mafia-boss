// Local notifications need no push (ADR 0058). expo-notifications' config plugin always adds the APNs
// entitlement (aps-environment), which needs the Push Notifications capability: a free Apple ID's personal
// team can't sign an app with it, and the game never uses it. This takes it back out.
//
// Keep it listed BEFORE expo-notifications in app.json: an entitlements step registered earlier runs later,
// so this one runs after expo-notifications has added the entitlement. (`npx expo config --type introspect`
// shows `entitlements: {}` when it works.)
const { withEntitlementsPlist } = require('expo/config-plugins')

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (c) => {
    delete c.modResults['aps-environment']
    return c
  })
}
