export function createScreenRegistry({ service, definitions, routeName = `${service}-screen` }) {
  const screenDefinitions = Object.fromEntries(
    definitions.map(({ name, ...definition }) => {
      const key = definition.key ?? `${service}-${name}`

      return [
        name,
        Object.freeze({
          ...definition,
          key,
          screenKey: definition.screenKey ?? key,
        }),
      ]
    }),
  )

  const screens = Object.values(screenDefinitions)
  const screenByKey = new Map(screens.map((screen) => [screen.key, screen]))
  const screenByDesignId = new Map(screens.map((screen) => [screen.designId, screen]))

  function getScreen(screenKey) {
    return screenByKey.get(screenKey) ?? null
  }

  function getScreenByDesignId(designId) {
    return screenByDesignId.get(designId) ?? null
  }

  function routeForScreen(screenKey) {
    const screen = getScreen(screenKey)
    if (!screen) return null

    return {
      name: screen.routeName ?? routeName,
      params: { screenKey: screen.screenKey },
    }
  }

  return {
    screenDefinitions,
    screens,
    screenByKey,
    screenByDesignId,
    getScreen,
    getScreenByDesignId,
    routeForScreen,
  }
}
