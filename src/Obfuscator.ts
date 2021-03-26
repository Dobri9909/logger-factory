import lodash from 'lodash';

enum Tag {
  PII = 'PII',
  SECRET = 'SECRET'
}

class Obfuscator {
  public obfuscateString(value: string, tag: Tag): string {
    const upperCasedTag = tag.toUpperCase();
    return `[${upperCasedTag}]${value}[/${upperCasedTag}]`;
  }

  public obfuscateObject<T extends Record<string, unknown>>(object: T, obfuscateSettings: Array<[string, Tag]>): T {
    const clonedObj = lodash.cloneDeep(object);
    const allPaths: Array<string> = this.collectPaths(object);

    const pathToTagMap = new Map();
    const allPathsToObfuscate = [];

    for (const anObfuscateSetting of obfuscateSettings) {
      pathToTagMap.set(anObfuscateSetting[0], anObfuscateSetting[1]);
      allPathsToObfuscate.push(anObfuscateSetting[0]);
    }

    for (const path of allPaths) {
      const actualPath = path[0];
      if (allPathsToObfuscate.some((propPath) => new RegExp(propPath[0]).test(actualPath))) {
        const rawValue = lodash.get(clonedObj, path);

        const tag = this.determineTag(pathToTagMap, path);
        if (!tag) {
          continue;
        }
        lodash.set(clonedObj, path, this.obfuscateString(rawValue as string, tag));
      }
    }

    return clonedObj;
  }

  public obfuscateError<T extends Error>(err: T, obfuscateSettings: Array<[string, Tag]>): T {
    const clonedErr = new Error(err.message);
    Object.setPrototypeOf(clonedErr, Object.getPrototypeOf(err));

    for (const prop of Object.getOwnPropertyNames(err)) {
      let dataToAssign = err[prop];
      if (lodash.isPlainObject(dataToAssign)) {
        const relevantSettings: Array<[string, Tag]> = obfuscateSettings
          .filter(([path]) => path.startsWith(prop) + '.')
          .map(([path, tag]) => [path.slice(prop.length + 1, path.length), tag]);

        if (relevantSettings.length) {
          dataToAssign = this.obfuscateObject(dataToAssign, relevantSettings);
        }
      }

      Object.assign(clonedErr, {
        [prop]: dataToAssign,
      });
    }

    return clonedErr as T;
  }

  private collectPaths(input: any, currentPath?: string) {
    const paths = [];

    if (lodash.isPlainObject(input)) {
      for (const key in input) {
        const fullPath: string = this.buildPath(key, currentPath);
        const value = input[key];

        paths.push(fullPath, ...this.collectPaths(value).map((nestedPath) => this.buildPath(nestedPath, fullPath)));
      }
    }

    return paths;
  }

  private buildPath(propPath: string, basePath?: string) {
    return basePath === undefined ? String(propPath) : `${basePath}.${propPath}`;
  }

  private determineTag(pathToTagMap: any, path: string) {
    const tag = pathToTagMap.get(path);
    return tag;
  }
}

export {
  Obfuscator,
  Tag,
};
